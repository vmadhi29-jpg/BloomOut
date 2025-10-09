// This file is a Vercel Edge Function that securely provides the API key to the client.
// By using the Edge runtime, it's fast and efficient.
// Make sure to set the API_KEY in your Vercel project's environment variables.

export const config = {
  runtime: 'edge', // Explicitly specify the runtime to resolve build ambiguities
};

// The request parameter is a standard Web API Request object.
// The function must return a standard Web API Response object.
export default function handler(request) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(`Method ${request.method} Not Allowed`, {
      status: 405,
      headers: {
        Allow: 'GET',
      },
    });
  }

  // In the Edge Runtime, process.env is a specially provided object.
  const apiKey = process.env.API_KEY;

  // Check if the environment variable is set
  if (!apiKey) {
    const errorPayload = { error: "The API_KEY environment variable is not set on the server." };
    return new Response(JSON.stringify(errorPayload), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send the API key back to the client
  const successPayload = { apiKey };
  return new Response(JSON.stringify(successPayload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
