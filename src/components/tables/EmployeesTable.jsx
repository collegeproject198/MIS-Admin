import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { User } from "react-feather";

// ImgWithFallback Component
const ImgWithFallback = ({ src, alt, name, fallbackElement, className }) => {
  const [imgSrc, setImgSrc] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Enhanced Google Drive URL converter
  const getDriveImageUrls = (originalUrl) => {
    if (!originalUrl || typeof originalUrl !== "string") return [];

    // Extract file ID from various Google Drive URL formats
    const fileIdMatch = originalUrl.match(
      /\/file\/d\/([^/]+)|id=([^&]+)|\/d\/([^/]+)/
    );
    const fileId = fileIdMatch
      ? fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3]
      : null;

    if (!fileId) return [originalUrl]; // Return original if we can't extract ID

    return [
      // Direct thumbnail URL with size parameter (most reliable)
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
      // Alternative thumbnail URL
      `https://lh3.googleusercontent.com/d/${fileId}=w400`,
      // Export view URL
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      // Original URL as fallback
      originalUrl,
    ];
  };

  useEffect(() => {
    if (!src || src.trim() === "") {
      // console.log("No image URL provided");
      setLoadFailed(true);
      return;
    }

    const urls = getDriveImageUrls(src);
    if (urls.length === 0) {
      setLoadFailed(true);
      return;
    }

    // Start with the first URL
    setImgSrc(urls[0]);
    setLoadFailed(false);
    setAttempts(0);
  }, [src]);

  const handleError = () => {
    const urls = getDriveImageUrls(src);
    const nextAttempt = attempts + 1;

    if (nextAttempt < urls.length) {
      // console.log(`Trying alternative URL ${nextAttempt + 1}/${urls.length}`);
      setImgSrc(urls[nextAttempt]);
      setAttempts(nextAttempt);
    } else {
      // console.log("All image loading attempts failed");
      setLoadFailed(true);
    }
  };

  if (loadFailed || !src) {
    return (
      <div className="flex flex-col items-center justify-center space-y-1">
        {fallbackElement ? (
          fallbackElement
        ) : (
          <div
            className={`${className} bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center`}
          >
            <span className="text-white text-lg font-bold">
              {name
                ?.split(" ")
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")
                .toUpperCase() || "?"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      onLoad={() => console.log("Image loaded successfully:", imgSrc)}
      className={`${className} object-cover`}
      loading="lazy"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  );
};

ImgWithFallback.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  name: PropTypes.string,
  fallbackElement: PropTypes.node,
  className: PropTypes.string,
};

// Utility functions
const convertGoogleDriveImageUrl = (url) => {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fileId = match[1];
      // Use thumbnail API which is more reliable for image display
      const finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
      // console.log("✅ Converted Google Drive URL:", finalUrl);
      return finalUrl;
    }
  }

  // console.warn("⚠️ Could not convert Google Drive URL:", url);
  return url;
};

const formatDate = (value) => {
  if (!value) return "—";

  if (typeof value === "string" && value.startsWith("Date(")) {
    try {
      const dateParts = value.match(/Date\((\d+),(\d+),(\d+)\)/);
      if (dateParts && dateParts.length === 4) {
        const year = parseInt(dateParts[1]);
        const month = parseInt(dateParts[2]);
        const day = parseInt(dateParts[3]);
        const date = new Date(year, month, day);
        return date.toLocaleDateString("en-GB");
      }
    } catch (e) {
      console.error("Error parsing Date() string:", e);
    }
  }

  if (typeof value === "string" && value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB");
    }
    return value;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

const getProgressValue = (value) => {
  if (!value && value !== 0) return null;

  let numValue;
  if (typeof value === "string") {
    numValue = parseFloat(value.replace("%", ""));
  } else {
    numValue = Number(value);
  }

  return !isNaN(numValue) ? numValue : null;
};

// Main Component
const EmployeesTable = ({ isCompact = false, filterTasks, dynamicHeaders }) => {
  const [processedData, setProcessedData] = useState([]);

  useEffect(() => {
    const processData = () => {
      return filterTasks.map((item) => {
        const imageHeader = dynamicHeaders.find((header) => header.isImage);
        if (!imageHeader) return item;

        const rawValue = String(item[imageHeader.id] || "").replace(
          /^"|"$/g,
          ""
        );

        let imageUrl = "";
        let userName = "";

        if (rawValue.includes(",")) {
          // If comma is present, split into image and name
          const parts = rawValue.split(/,(.+)/); // split on first comma only
          imageUrl = parts[0]?.trim() || "";
          userName = parts[1]?.trim() || "";
        } else if (rawValue.startsWith("http")) {
          // Only image present
          imageUrl = rawValue.trim();
          userName = "";
        } else {
          // Only name present
          imageUrl = "";
          userName = rawValue.trim();
        }

        const finalUrl = convertGoogleDriveImageUrl(imageUrl);

        return {
          ...item,
          _imageUrl: finalUrl,
          _userName: userName || "User", // Default to "User" if name is empty
        };
      });
    };

    setProcessedData(processData());
  }, [filterTasks, dynamicHeaders]);

  const renderCell = (item, header) => {
    const value = item[header.id];

    if (header.isImage) {
      const imageUrl = item._imageUrl || "";
      const userName = item._userName || "User";

      return (
        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center space-x-2">
            <ImgWithFallback
              src={imageUrl}
              alt={`${userName} profile`}
              name={userName}
              className="w-10 h-10 rounded-full"
              fallbackElement={
                <div className="w-10 h-10 bg-gray-200 rounded-full p-2 flex items-center justify-center">
                  <User size={16} className="text-gray-400" />
                </div>
              }
            />
            <span className="font-medium">{userName}</span>
          </div>
        </td>
      );
    }

    if (header.isProgress) {
      const progressValue = getProgressValue(value);

      if (progressValue === null) {
        return (
          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
            <span className="text-gray-400">—</span>
          </td>
        );
      }

      const isNegative = progressValue < 0;
      const displayValue = Math.abs(progressValue);
      const barWidth = Math.min(100, displayValue);

      return (
        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center">
            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
              <div
                className={`h-2 rounded-full ${
                  isNegative ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${barWidth}%` }}
              ></div>
            </div>
            <span
              className={`text-xs ${
                isNegative ? "text-red-600" : "text-blue-600"
              }`}
            >
              {progressValue}%
            </span>
          </div>
        </td>
      );
    }

    if (header.isDate) {
      return (
        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
          {value ? formatDate(value) : "—"}
        </td>
      );
    }

    return (
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
        {value || "—"}
      </td>
    );
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
        isCompact ? "max-h-96" : ""
      }`}
    >
      <div className="overflow-scroll">
        <div className={`min-w-full ${isCompact ? "max-h-96" : ""}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
              <tr>
                {dynamicHeaders.map((header, index) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 h-16 text-center cursor-pointer hover:bg-gray-50 transition-colors duration-200 group relative"
                    onClick={() => handleSort(header.id)}
                  >
                    <div className="flex flex-col h-full justify-center items-center space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {header.label}
                        </span>
                        {header.isImage && (
                          <div
                            className="w-2 h-2 bg-green-400 rounded-full"
                            title="Image Column"
                          />
                        )}
                        {header.isDate && (
                          <div
                            className="w-2 h-2 bg-blue-400 rounded-full"
                            title="Date Column"
                          />
                        )}
                        {header.isProgress && (
                          <div
                            className="w-2 h-2 bg-orange-400 rounded-full"
                            title="Progress Column"
                          />
                        )}
                      </div>
                    </div>

                    {index < dynamicHeaders.length - 1 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-200"></div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            {/* <thead className="bg-gray-50 sticky top-0">
              <tr>
                {dynamicHeaders.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead> */}
            <tbody className="bg-white divide-y divide-gray-200">
              {processedData.map((item, index) => (
                <tr
                  key={item._id || item.id || index}
                  className="hover:bg-gray-50"
                >
                  {dynamicHeaders.map((header) => (
                    <React.Fragment key={header.id}>
                      {renderCell(item, header)}
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

EmployeesTable.propTypes = {
  filterTasks: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      col2: PropTypes.string,
      col3: PropTypes.string,
    })
  ).isRequired,
  isCompact: PropTypes.bool,
  dynamicHeaders: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      isProgress: PropTypes.bool,
      isImage: PropTypes.bool,
      isDate: PropTypes.bool,
    })
  ).isRequired,
};

export default EmployeesTable;
