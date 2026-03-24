import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

//
// TASKS
//
app.get("/tasks", async (req, res) => {
  const { data } = await supabase.from("tasks").select("*");
  res.json(data);
});

app.post("/tasks", async (req, res) => {
  const { title, dl } = req.body;

  const { data } = await supabase.from("tasks").insert([
    {
      id: Date.now().toString(),
      title,
      dl, // deadline hem ýazylýar
    },
  ]);

  res.json(data);
});

app.delete("/tasks/:id", async (req, res) => {
  await supabase.from("tasks").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

//
// WORKERS
//
app.get("/workers", async (req, res) => {
  const { data } = await supabase.from("workers").select("*");
  res.json(data);
});

app.post("/workers", async (req, res) => {
  const { name } = req.body;

  await supabase.from("workers").insert([
    {
      id: Date.now().toString(),
      name,
    },
  ]);

  res.json({ ok: true });
});

//
// ATTENDANCE
//
app.get("/attend", async (req, res) => {
  const { data } = await supabase.from("attend").select("*");
  res.json(data);
});

app.post("/attend", async (req, res) => {
  const { wid } = req.body;

  await supabase.from("attend").insert([
    {
      id: Date.now().toString(),
      wid,
      date: new Date().toISOString(),
      inn: new Date().toLocaleTimeString(),
    },
  ]);

  res.json({ ok: true });
});

app.listen(5000, () => console.log("SERVER OK 5000"));
