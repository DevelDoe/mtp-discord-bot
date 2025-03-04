import { Client, GatewayIntentBits } from "discord.js";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

// Discord bot setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
const token = process.env.DISCORD_TOKEN;
let channelId = null; // No longer using .env for channel ID

// Start Discord bot
client.once("ready", async () => {
    console.log("🤖 Discord bot is online!");

    try {
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.error("❌ Bot is not in any servers!");
            return;
        }

        // Check if the channel exists in the guild
        let channel = guild.channels.cache.find((ch) => ch.name === "mtp-alerts");

        if (!channel) {
            console.log("📢 Creating a new channel: #mtp-alerts...");
            channel = await guild.channels.create({
                name: "mtp-alerts",
                type: 0, // Text channel
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                    },
                ],
            });
            channelId = channel.id;
            console.log(`✅ Created channel: #${channel.name}`);
        } else {
            channelId = channel.id;
            console.log(`✅ Channel already exists: #${channel.name}`);
        }

        await channel.send("✅ Moms Traders Provider BOT is in active development and not a finished product yet! If you have any thought pm me @.dusteye");
        console.log(`📤 Test message sent successfully in #${channel.name}!`);

        // Initialize WebSocket AFTER channel is ready
        const ws = new WebSocket(process.env.MTP_SERVER);

        ws.on("open", () => {
            console.log("🔗 Connected to MTP Alerts");
            ws.send(JSON.stringify({ client_id: "discord-bot" }));
        });

        ws.on("message", async (data) => {
            console.log("🔥 RAW WebSocket Data:", data.toString());
            try {
                const alert = JSON.parse(data.toString());
                console.log("📢 Received Alert:", alert);
        
                // Filter out alerts with change_percent < 1%
                if (Math.abs(alert.change_percent) < 3) {
                    console.log(`⏩ Skipping alert for ${alert.symbol} (change_percent: ${alert.change_percent}%)`);
                    return;
                }
        
                // Add direction indicator
                const directionIndicator = alert.direction === "UP" ? "🟢 (UP)" : "🔴 (DOWN)";
        
                const message = `# 🚨 **${alert.symbol}** \n📊 **Change**: ${directionIndicator} ${alert.change_percent}%\n💰 **Price**: $${alert.price}\n📉 **Volume**: ${alert.volume}K\n🕒 **Time**: ${new Date().toLocaleString()}`;                
                
                const channel = await client.channels.fetch(channelId);
                await channel.send(message);
                console.log(`✅ Sent alert to Discord: ${alert.symbol}`);
        
            } catch (err) {
                console.error("❌ Error processing alert:", err);
            }
        });

        ws.on("error", (err) => console.error("❌ WebSocket Error:", err));
        ws.on("close", () => console.log("🔴 Disconnected from MTP Alerts"));

    } catch (err) {
        console.error("❌ Error during setup:", err);
    }
});

client.login(token);