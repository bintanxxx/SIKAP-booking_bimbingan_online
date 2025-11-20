import express from "express";
import serverless from "serverless-http";

const app = express()

export const handler = serverless(app)