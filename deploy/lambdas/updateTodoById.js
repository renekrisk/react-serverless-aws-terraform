// MIT License
//
// Copyright (c) 2019 Georgios Papachristou
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Improved updateTodoById Lambda:
// - async/await
// - DocumentClient for cleaner JSON
// - env-driven region and table name
// - safer path/id extraction
// - basic payload validation and clearer responses

const AWS = require("aws-sdk");

const REGION = process.env.AWS_REGION || "us-east-1";
const TODOS_TABLE_NAME = process.env.TODOS_TABLE_NAME || "todos";

AWS.config.update({ region: REGION });

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

exports.handler = async (event) => {
  console.log("updateTodoById invoked with event:", JSON.stringify(event));

  // Prefer standard API Gateway proxy pattern, but keep fallback for legacy usage
  const pathParams = event.pathParameters || {};
  const todoIdFromParams = pathParams.id || pathParams.todoId;
  const todoIdFromPath =
    !todoIdFromParams && event.path ? event.path.split("/")[2] : null;

  const todoId = todoIdFromParams || todoIdFromPath;

  if (!todoId) {
    return {
      statusCode: 400,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Missing todoId in path parameters.",
      }),
    };
  }

  let payload;
  try {
    payload = event && event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    console.error("Invalid JSON body:", err);
    return {
      statusCode: 400,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Invalid request body. Expected valid JSON.",
      }),
    };
  }

  const { name, description } = payload;

  if (!name && !description) {
    return {
      statusCode: 400,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "At least one of the fields 'name' or 'description' must be provided.",
      }),
    };
  }

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (name) {
    updateExpressions.push("#N = :n");
    expressionAttributeNames["#N"] = "name";
    expressionAttributeValues[":n"] = name;
  }

  if (description) {
    updateExpressions.push("#D = :d");
    expressionAttributeNames["#D"] = "description";
    expressionAttributeValues[":d"] = description;
  }

  const params = {
    TableName: TODOS_TABLE_NAME,
    Key: { todoId },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await ddb.update(params).promise();

    console.log("Successfully updated todo:", result.Attributes);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Todo updated successfully.",
        item: result.Attributes,
      }),
    };
  } catch (err) {
    console.error("Error while updating todo:", err);

    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Failed to update todo.",
        error: err.message || "Unknown error",
      }),
    };
  }
};
