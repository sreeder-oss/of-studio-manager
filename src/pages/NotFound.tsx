import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Error 404</p>
        <h1 className="font-serif text-3xl text-foreground">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          We couldn't find <span className="text-foreground/80 font-mono text-xs">{location.pathname}</span>.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[11px] font-bold uppercase tracking-widest hover:text-foreground"
          >
            Go back
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest shadow-glow"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
