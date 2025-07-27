import React from 'react';

const FallbackComponent: React.FC<{ name: string }> = ({ name }) => {
  return (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h2 className="text-lg font-semibold text-yellow-800">Component Loading</h2>
      <p className="text-yellow-700">
        {name} is temporarily disabled for debugging.
      </p>
    </div>
  );
};

export default FallbackComponent;
