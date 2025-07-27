import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width = '100%',
  height,
  animation = 'pulse'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'rectangular':
        return 'rounded-lg';
      case 'circular':
        return 'rounded-full';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[wave_2s_infinite]';
      case 'pulse':
      default:
        return 'animate-pulse bg-gray-200';
    }
  };

  const defaultHeight = variant === 'text' ? '1rem' : height || '1rem';

  return (
    <div
      className={`${getVariantClasses()} ${getAnimationClasses()} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof defaultHeight === 'number' ? `${defaultHeight}px` : defaultHeight,
      }}
    />
  );
};

// Pre-built skeleton components for common use cases
export const DashboardCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton variant="circular" width={48} height={48} />
      <Skeleton variant="text" width={60} height={20} />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" width="80%" height={24} />
      <Skeleton variant="text" width="60%" height={16} />
    </div>
    <Skeleton variant="rectangular" width="100%" height={8} />
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton variant="text" width={index === 0 ? "80%" : "60%"} height={16} />
      </td>
    ))}
  </tr>
);

export const POSItemSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height={18} />
        <Skeleton variant="text" width="40%" height={14} />
      </div>
      <Skeleton variant="circular" width={24} height={24} />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" width="50%" height={16} />
      <Skeleton variant="text" width="30%" height={14} />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Skeleton variant="rectangular" width="100%" height={32} />
      <Skeleton variant="rectangular" width="100%" height={32} />
    </div>
  </div>
);

export const MenuBuilderItemSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width="60%" height={20} />
      <div className="flex items-center space-x-2">
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
    </div>
    <Skeleton variant="text" width="80%" height={14} />
    <div className="flex items-center justify-between">
      <Skeleton variant="text" width="30%" height={16} />
      <Skeleton variant="text" width="25%" height={16} />
    </div>
  </div>
);

export default Skeleton;
