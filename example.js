const {
    Client,
    ApplicationCommandTypes,
    ApplicationCommandOptionTypes,
    InteractionTypes,
  } = require("oceanic.js");
  const client = new Client({
    auth: "Bot [token]",
  });
  
  // constants
  const guildId = "781817599931056160";
  
  client.on("ready", async () => {
    // On bot ready
  
    await registerCommands();
    console.log("Ready!");
  });
  
  async function registerCommands() {
    await client.application.createGlobalCommand({
      name: "workout",
      description: "A description",
      type: ApplicationCommandTypes.CHAT_INPUT,
      options: [
        {
          name: "add",
          type: ApplicationCommandOptionTypes.SUB_COMMAND,
          description: "Add wahtever",
          options: [
            {
              name: "date",
              description: "The date",
              type: ApplicationCommandOptionTypes.STRING,
              required: false,
            },
          ],
        },
        {
          name: "remove",
          type: ApplicationCommandOptionTypes.SUB_COMMAND,
          description: "Remove wahtever",
          options: [
            {
              name: "date",
              description: "The date",
              type: ApplicationCommandOptionTypes.STRING,
              required: false,
            },
          ],
        },
      ],
    });
  }
  
  client.on("interactionCreate", async (interaction) => {
    switch (interaction.type) {
      case InteractionTypes.APPLICATION_COMMAND: {
        // If its an application command
        switch (interaction.data.name) {
          case "workout": {
            // If its the workout command
            const option = interaction.data.options.raw[0];
            const date = option.options[0] ? option.options[0].value : undefined;
            if (option.name === "add") {
             // add
            } else if (option.name === "remove") {
              // remove
            }
          }
        }
      }
    }
  });
  
  client.on("error", (err) => {
    console.error("Something Broke!", err);
  });
  
  client.connect();