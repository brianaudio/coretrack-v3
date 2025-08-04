'use client';

import FirebaseDataDiagnostic from '../../components/FirebaseDataDiagnostic';

export default function FirebaseDiagnosticPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Firebase Data Recovery</h1>
        <FirebaseDataDiagnostic />
      </div>
    </div>
  );
}
