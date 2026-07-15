export const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-8xl font-bold text-gray-200 dark:text-gray-800">404</h1>
      <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
      <p className="text-gray-500 mt-2 max-w-md">
        The page you are looking for doesn't exist or has been moved. Use the sidebar to navigate back to a valid module.
      </p>
    </div>
  );
};
