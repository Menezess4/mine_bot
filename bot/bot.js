const mineflayer = require("mineflayer");
const Vec3 = require("vec3");
const readline = require("node:readline");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");

async function getPlan() {
  const response = await fetch("http://127.0.0.1:8765/plan");

  if (!response.ok) {
    throw new Error(`Erro HTTP: ${response.status}`);
  }

  return response.json();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


const bot = mineflayer.createBot({
  host: "127.0.0.1",
  port: 59287, // troque pela porta atual do mundo LAN
  username: 'teste',
  
});

bot.loadPlugin(pathfinder);

function askPermission() {
  return new Promise((resolve) => {
    rl.question("Autorizar a construção? Digite sim: ", resolve);
  });
}

async function buildPlatform(plan) {
  const width = Number(plan.width);
  const depth = Number(plan.depth);
  const material = plan.material;

  if (plan.task !== "build_platform") {
    throw new Error(`Tarefa desconhecida: ${plan.task}`);
  }

  if (!Number.isInteger(width) || !Number.isInteger(depth) ||
      width < 1 || depth < 1 || width > 10 || depth > 10) {
    throw new Error("Largura ou profundidade inválida.");
  }

  const requiredBlocks = width * depth;
  const availableBlocks = bot.inventory.items()
    .filter((item) => item.name === material)
    .reduce((total, item) => total + item.count, 0);

  if (availableBlocks < requiredBlocks) {
    throw new Error(
      `Preciso de ${requiredBlocks} ${material}; tenho ${availableBlocks}.`
    );
  }

  // A plataforma será construída na diagonal à frente do bot.
  const startX = Math.floor(bot.entity.position.x) + 2;
  const y = Math.floor(bot.entity.position.y);
  const startZ = Math.floor(bot.entity.position.z) + 2;

  const movements = new Movements(bot);
  movements.canDig = false;
  movements.allow1by1towers = false;
  bot.pathfinder.setMovements(movements);

  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      const target = new Vec3(startX + dx, y, startZ + dz);
      const support = bot.blockAt(target.offset(0, -1, 0));
      const existing = bot.blockAt(target);

      if (!support || support.boundingBox !== "block") {
        throw new Error(`Não há bloco de apoio sólido em ${target}.`);
      }

      if (!existing || existing.name !== "air") {
        throw new Error(`O espaço ${target} não está vazio.`);
      }

      await bot.pathfinder.goto(
        new goals.GoalLookAtBlock(support.position, bot.world)
      );

      const planks = bot.inventory.items()
        .find((item) => item.name === material);

      if (!planks) {
        throw new Error(`Acabaram os blocos ${material}.`);
      }

      await bot.equip(planks, "hand");
      await bot.lookAt(support.position.offset(0.5, 1, 0.5), true);
      await bot.placeBlock(support, new Vec3(0, 1, 0));

      console.log(`Bloco colocado em ${target}.`);
    }
  }

  console.log("Plataforma concluída!");
}

bot.once("spawn", async () => {
  console.log("Bot entrou no Minecraft.");

  try {
    const plan = await getPlan();
    console.log("Plano recebido:", plan);

    if (plan.confirmation_required) {
      const answer = await askPermission();

      if (answer.trim().toLowerCase() !== "sim") {
        console.log("Construção cancelada.");
        bot.quit();
        return;
      }
    }

    await buildPlatform(plan);
  } catch (error) {
    console.error("Não foi possível construir:", error.message);
  }
});

bot.on("kicked", (reason) => console.log("Bot foi removido:", reason));
bot.on("error", (error) => console.error("Erro do bot:", error));