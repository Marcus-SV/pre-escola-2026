import { google } from 'googleapis';
import path from 'path';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export function getAuth() {
  // Check for credentials in environment variable (JSON string)
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
  }

  // Check for credentials file path
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'credentials.json');
  
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: SCOPES,
  });
}
