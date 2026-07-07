import axios from "axios";

const config = {
  endpoint: process.env.LAMATIC_ENDPOINT,
  apiKey: process.env.LAMATIC_API_KEY,
  projectId: process.env.LAMATIC_PROJECT_ID,
  workflowId: process.env.LAMATIC_WORKFLOW_ID,
};

export async function queryDocs(text) {
  const query = `
    query ExecuteWorkflow($workflowId: String!, $question: String) {
      executeWorkflow(
        workflowId: $workflowId
        payload: { question: $question }
      ) {
        status
        result
      }
    }
  `;

  let response;
  try {
    response = await axios.post(
      config.endpoint,
      { query, variables: { workflowId: config.workflowId, question: text } },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "x-project-id": config.projectId,
        },
      }
    );
  } catch (err) {
    const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`HTTP ${err.response?.status}: ${body}`);
  }

  if (response.data.errors) {
    throw new Error(JSON.stringify(response.data.errors));
  }

  const result = response.data?.data?.executeWorkflow?.result;
  return result?.modelResponse ?? result?.answer ?? JSON.stringify(result);
}
