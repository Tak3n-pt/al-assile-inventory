import React from 'react';
import { motion } from 'framer-motion';

const PageHeader = ({ title, subtitle, icon: Icon, actions, gradient = 'from-accent-primary to-accent-secondary' }) => {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Icon */}
          {Icon && (
            <div className={`
              w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient}
              flex items-center justify-center shadow-lg
            `}>
              <Icon className="w-7 h-7 text-white" />
            </div>
          )}

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-dark-400 mt-1 text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* Decorative line */}
      <div className="mt-6 h-px bg-gradient-to-r from-dark-700 via-dark-600 to-transparent" />
    </motion.div>
  );
};

export default PageHeader;
