import { app } from "./app";
import { config } from "./config";

app.listen(config.PORT, config.HOST, () => {
  console.log(`API is running on http://${config.HOST}:${config.PORT}`);
});
