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

// Improved createTodo Lambda:
// - async/await
// - DocumentClient for cleaner JSON
// - region and table name via env vars
// - basic payload validation
// - returns the created item instead of raw DynamoDB response

const AWS = require("aws-sdk");

const REGION = process.env.AWS_REGION || "us-east-1";
const TODOS_TABLE_NAME = process.env.TODOS_TABLE_NAME || "todos";

AWS.config.update({ region: REGION });

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

exports.handler = async (event) => {
  console.log("createTodo invoked with event:", JSON.stringify(event));

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

  const { username, name, description } = payload;

  if (!username || !name || !description) {
    return {
      statusCode: 400,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Missing required fields: username, name, description.",
      }),
    };
  }

  const requestContext = event.requestContext || {};
  const identity = requestContext.identity || {};

  const todoItem = {
    todoId: requestContext.requestId || `${Date.now()}`,
    identityId: identity.cognitoIdentityId || "anonymous",
    username,
    name,
    description,
    createdAt: new Date().toISOString(),
  };

  const params = {
    TableName: TODOS_TABLE_NAME,
    Item: todoItem,
  };

  try {
    await ddb.put(params).promise();
    console.log("Successfully created todo:", todoItem);

    return {
      statusCode: 201,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Todo created successfully.",
        item: todoItem,
      }),
    };
  } catch (err) {
    console.error("Error while creating todo item:", err);

    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Failed to create todo.",
        error: err.message || "Unknown error",
      }),
    };
  }
};
