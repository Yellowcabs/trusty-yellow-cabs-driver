import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0592717447",
    });
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase admin client for backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder'))
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Trusty Yellow Backend is running",
    databaseConnected: !!supabase
  });
});

app.get("/api/trips", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { status, driver_id, limit = 50 } = req.query;
    
    let query = supabase
      .from('trips')
      .select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (driver_id) {
      query = query.eq('driver_id', driver_id);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/drivers", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { is_online, search, limit = 50 } = req.query;
    
    let query = supabase
      .from('drivers')
      .select('*');
    
    if (is_online !== undefined) {
      query = query.eq('is_online', is_online === 'true');
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%,phone.ilike.%${search}%,vehicle_number.ilike.%${search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trips", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { data, error } = await supabase
      .from('trips')
      .insert([req.body])
      .select();
    if (error) throw error;
    const newTrip = data[0];

    // Background push notification to online drivers
    supabase.from('drivers')
      .select('fcm_token')
      .eq('is_online', true)
      .not('fcm_token', 'is', null)
      .then(({ data: onlineDrivers }) => {
        if (onlineDrivers && onlineDrivers.length > 0) {
          const tokens = onlineDrivers.map(d => d.fcm_token).filter(t => !!t) as string[];
          if (tokens.length > 0) {
            admin.messaging().sendEachForMulticast({
              notification: {
                title: "New Trip Request! 🚕",
                body: `Pickup: ${newTrip.pickup} to ${newTrip.drop}`,
              },
              data: {
                type: "NEW_TRIP",
                tripId: newTrip.id,
                url: "/requests"
              },
              tokens: tokens,
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'trip-requests'
                }
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1
                  }
                }
              }
            }).catch(e => console.error("FCM Error:", e));
          }
        }
      }).catch(e => console.error("Supabase Drivers Fetch Error:", e));

    res.json(newTrip);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/drivers/:id/online", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  const { isOnline } = req.body;
  try {
    const { data, error } = await supabase
      .from('drivers')
      .update({ is_online: isOnline })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function setupApp() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupApp();

export default app;
