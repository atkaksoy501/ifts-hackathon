import { createApp } from "./app.js";
import { loadConfig } from "./shared/config.js";

const config = loadConfig();
const app = await createApp(config);

app.listen(config.PORT, () => {
  console.log(`module1-advisor listening on :${config.PORT}`);
});
