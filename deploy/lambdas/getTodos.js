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

// Improved getTodos Lambda:
// - uses async/await
// - uses DocumentClient for nicer JSON
// - pulls region & table name from env when available
// - returns a clean, structured JSON payload

const AWS = require("aws-sdk");

// Prefer environment configuration, fall back to defaults for local usage
const REGION = process.env.AWS_REGION || "us-east-1";
const TODOS_TABLE_NAME = process.env.TODOS_TABLE_NAME || "todos";

AWS.config.update({ region: REGION });

// DocumentClient: more human-friendly item shapes than low-level DynamoDB API
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

exports.handler = async (event) => {
  console.log("getTodos invoked with event:", JSON.stringify(event));

  const params = {
    TableName: TODOS_TABLE_NAME,
  };

  try {
    const data = await ddb.scan(params).promise();

    console.log("Successfully fetched todos:", {
      count: data.Count,
      scannedCount: data.ScannedCount,
    });

    const responseBody = {
      items: data.Items || [],
      count: data.Count || 0,
      scannedCount: data.ScannedCount || 0,
    };

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(responseBody),
    };
  } catch (err) {
    console.error("Error while scanning todos table:", err);

    const errorBody = {
      message: "Failed to fetch todos.",
      error: err.message || "Unknown error",
    };

    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(errorBody),
    };
  }
};
