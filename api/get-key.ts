
// Vercel will automatically turn this file into a serverless function
// accessible at the path /api/get-key.
// This function securely reads the API_KEY from the server environment
// and sends it to the frontend, which is the standard practice for Vercel deployments.
// Make sure to set the API_KEY in your Vercel project's environment variables.

// We are not using the Vercel-provided request/response types to avoid
// adding dependencies, but this structure is compatible.
export default function handler(request, response) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).end(`Method ${request.method} Not Allowed`);
  }

  const apiKey = process.env.API_KEY;

  // Check if the environment variable is set on the server
  if (!apiKey) {
    return response.status(500).json({ 
      error: "The API_KEY environment variable is not set on the server." 
    });
  }

  // Send the API key to the client
  response.status(200).json({ apiKey });
}
