import "../styles/ErrorPage.css";

// ErrorPage component to display a 404 error message for undefined routes
function ErrorPage() {
  return (
    <div className="error-container">
      <h1 className="error-title">404</h1>
      <p className="error-message">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a href="/" className="error-link">
        Go Back to Home
      </a>
    </div>
  );
}

export default ErrorPage;
