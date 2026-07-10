import fs from "fs";
import path from "path";

fs.rmSync(path.join(process.cwd(), "dist"), { recursive: true, force: true });
