import app from '../server';

export default app;


import cors from "cors";

app.use(cors({
  origin: [
    "https://trusty-yellow-cabs-driver.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true
}));