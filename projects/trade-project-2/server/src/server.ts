import "./config/env.js";
import app from "./app.js";
import { dbConnect } from "./config/db.js";

async function startServer() {
    await dbConnect(process.env.DB_URI);

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })
}

startServer().catch((err) => { 
    console.log(`Failed to start server: ${err}`);
    process.exit(1);
})