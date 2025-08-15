// PayMongo configuration
export const PAYMONGO_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY || '',
  secretKey: process.env.PAYMONGO_SECRET_KEY || '',
  baseUrl: 'https://api.paymongo.com/v1',
};