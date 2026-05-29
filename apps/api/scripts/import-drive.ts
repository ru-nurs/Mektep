import { importFromGoogleDrive } from "../src/lib/drive-importer";
import { prisma } from "../src/prisma";

async function main() {
  await importFromGoogleDrive();
  console.log("Google Drive import completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
