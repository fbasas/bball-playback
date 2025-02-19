import express = require('express');
import {TestRouter} from "./routes/test";
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    console.log('Hello World!');
})

app.use('/test', TestRouter);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
