import React from 'react';

export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`p-6 border-b border-slate-100 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={`text-lg font-bold text-slate-800 ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};
