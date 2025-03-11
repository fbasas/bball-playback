import express = require('express');
import cors = require('cors');
import { TestRouter } from "./routes/test";
import { GameRouter } from "./routes/game";

const app = express();
const port = parseInt(process.env.PORT || '3001'); // Use PORT from .env or default to 3001

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/game', GameRouter);
app.use('/test', TestRouter);

app.listen(port, () => {
    console.log(`Baseball Playback API listening at http://localhost:${port}`);
});
