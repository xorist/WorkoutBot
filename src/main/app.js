const {
    Client,
    ApplicationCommandTypes,
    ApplicationCommandOptionTypes,
    InteractionTypes,
    } = require("oceanic.js");
require("dotenv").config();
const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();

const client = new Client({
    auth: "Bot " + process.env.TOKEN,
});

// constants
const guildId = "781817599931056160";
const regex = /^\d{2}\/\d{2}\/\d{4}$/;

// Get the date of the next Sunday
function getNextSunday() {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
}

// Schedule beginning of the week roster reset
function scheduleUpdateRoster() {
    const nextSunday = getNextSunday();
    const now = new Date();
    const timeToNextSunday = nextSunday - now;
  
    setTimeout(() => {
        updateRoster();  // Run the function once
        setInterval(updateRoster, 7 * 24 * 60 * 60 * 1000);  // Then schedule it to run every week
    }, timeToNextSunday);
}

// Initialize and run startup procedures
client.on("ready", async () => {
    await registerCommands();
    scheduleUpdateRoster();
    console.log("Ready!");
});

// Define commands
async function registerCommands() {
await client.application.createGlobalCommand({
    name: "workout",
    description: "A description",
    type: ApplicationCommandTypes.CHAT_INPUT,
    options: [
    {
        name: "add",
        type: ApplicationCommandOptionTypes.SUB_COMMAND,
        description: "Add a workout (MM/DD/YYYY)",
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
        description: "Remove a workout (MM/DD/YYYY)",
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

// update the roster message
async function updateRoster() {
    // check if message from bot already exists
    rosterMessageID = 0;
    const messages = await client.rest.channels.getMessages(process.env.CHANNEL, {
        limit: 100,
    });

    for (const message of messages) {
        if (message.author.id === client.user.id) {
            rosterMessageID = message.id;
            break;
        }
    }
    
    if(rosterMessageID === 0) {
        // create message and set rosterMessageID to the message's ID
        const rosterMessage = await client.rest.channels.createMessage(process.env.CHANNEL, {
            content: "Creating roster..",
        });
        rosterMessageID = rosterMessage.id;
    }

    console.log("rosterMessageID: " + rosterMessageID);

    // open workouts database
    let db = new sqlite3.Database('./workouts.db', (err) => {
        if (err) {
          console.error(err.message);
        }
    });

    // get workouts from database for this week, from Sunday to Saturday.
    let workouts = [];
    let sql = `SELECT * FROM workouts WHERE date BETWEEN ? AND ?`;
    let startdate = moment().startOf('week').format('MM/DD/YYYY');
    let enddate = moment().endOf('week').format('MM/DD/YYYY');
    
    function queryDatabase(startdate, enddate) {
      return new Promise((resolve, reject) => {
        db.all(sql, [startdate, enddate], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        });
      });
    }
    
    async function yourAsyncFunction() {
      try {
        const rows = await queryDatabase(startdate, enddate);
        workouts.push(...rows);
      } catch (err) {
        console.error(err.message);
      }
      
      // Now that the database operation is complete, log the workouts
      console.log(workouts);

          // create roster formatted where the users who've completed a workout are listed next to the name of the day of the week.
          let roster = "```diff\n";
          let date = moment().startOf('week').format('MM/DD/YYYY');
          
          for (let i = 0; i < 7; i++) {
              let dayWorkouts = [];
              roster += moment(date).format('dddd') + ": ";
          
              for (let j = 0; j < workouts.length; j++) {
                  if (workouts[j].date === date) {
                      dayWorkouts.push(workouts[j].name);
                  }
              }
              
              // Join the workouts with a comma and append to roster
              roster += dayWorkouts.join(", ");
              
              roster += "\n";
              date = moment(date).add(1, 'days').format('MM/DD/YYYY');
          }
          roster += "```";
          

    // update roster message
    await client.rest.channels.editMessage(process.env.CHANNEL, rosterMessageID, {
        content: roster,
    });
    }
    
    // Invoke the function
    await yourAsyncFunction();
    
    db.close();

}

async function updateDatabase(date, name, action) {
    let db = new sqlite3.Database('./workouts.db', (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS workouts(date text, name text)`);

    if(action === "remove") {
        db.run(`DELETE FROM workouts WHERE date = ? AND name = ?`, [date, name], function(err) {
            if (err) {
                return console.log(err.message);
            }
        });
    }

    if(action === "add") {
        // make sure workout doesn't already exist
        db.get(`SELECT * FROM workouts WHERE date = ? AND name = ?`, [date, name], (err, row) => {
            if (err) {
                return console.error(err.message);
            }
            if(row) {
                return console.log("Workout already exists!");
            } else {
                db.run(`INSERT INTO workouts(date, name) VALUES(?, ?)`, [date, name], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                });
            }
        });
    }

    db.close();
    updateRoster();
}

// handle interactions
client.on("interactionCreate", async (interaction) => {
    switch (interaction.type) {
        case InteractionTypes.APPLICATION_COMMAND: {
            interaction.defer();
            switch (interaction.data.name) {
                case "workout": {
                    const option = interaction.data.options.raw[0];
                    const date = option.options[0] ? option.options[0].value : undefined;
                    if (option.name === "add") {
                        // check if date is valid
                        if(!date) {
                            await interaction.createFollowup({
                                content: "Date required!",
                            });
                            break;
                        }
                        if(!regex.test(date)) {
                            await interaction.createFollowup({
                                content: "Invalid date!",
                            });
                            break;
                        }
                        if(!moment(date).isValid()) {
                            await interaction.createFollowup({
                                content: "Invalid date!",
                            });
                            break;
                        }
                        // update SQLite Database with new workout and user's name as parameters
                        updateDatabase(date, interaction.member.user.username, option.name);

                        await interaction.createFollowup({
                            content: "Workout added! (If something is wrong, please make sure you used the following date format: MM/DD/YYYY)",
                        });
                        break;
                    } else if (option.name === "remove") {
                        // check if date is valid
                        if(!date) {
                            await interaction.createFollowup({
                                content: "Date required!",
                            });
                            break;
                        }
                        if(!regex.test(date)) {
                            await interaction.createFollowup({
                                content: "Invalid date!",
                            });
                            break;
                        }
                        if(!moment(date).isValid()) {
                            await interaction.createFollowup({
                                content: "Invalid date!",
                            });
                            break;
                        }
                        updateDatabase(date, interaction.member.user.username, option.name);
                        await interaction.createFollowup({
                            content: "Workout removed! (If something is wrong, please make sure you used the following date format: MM/DD/YYYY)",
                        });
                        break;
                    }
                }
                default: {
                    await client.rest.channels.createMessage(interaction.channelID, {
                        content: "Invalid command!",
                    });
                    break;
                }
            }
        }
    }
});

client.on("error", (err) => {
    console.error("Something Broke!", err);
});

client.connect();