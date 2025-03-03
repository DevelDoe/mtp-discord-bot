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
const channelId = process.env.DISCORD_CHANNEL_ID;

// WebSocket connection to MTP server
const ws = new WebSocket(process.env.MTP_SERVER);

ws.on("open", () => {
    console.log("🔗 Connected to MTP Alerts");
    ws.send(JSON.stringify({ client_id: "discord-bot" })); // Register with server
});

ws.on("message", async (data) => {
    console.log("🔥 RAW WebSocket Data:", data.toString());
    try {
        const alert = JSON.parse(data.toString());
        console.log("📢 Received Alert:", alert);

        const message = `🚨 **Market Alert**: **${alert.symbol}**\n📊 Change: ${alert.change_percent}%\n💰 Price: $${alert.price}\n📉 Volume: ${alert.volume}\n🕒 Time: ${alert.time}`;

        const channel = await client.channels.fetch(channelId).catch(err => {
            console.error("❌ Failed to fetch channel:", err);
        });
        if (!channel) return;
        await channel.send(message);
        console.log(`✅ Sent alert to Discord: ${alert.symbol}`);
        
    } catch (err) {
        console.error("❌ Error processing alert:", err);
    }
});

ws.on("error", (err) => console.error("❌ WebSocket Error:", err));
ws.on("close", () => console.log("🔴 Disconnected from MTP Alerts"));

// Start Discord bot
client.once("ready", async () => {
    console.log("🤖 Discord bot is online!");

    try {
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.error("❌ Bot is not in any servers!");
            return;
        }

        let channel = client.channels.cache.get(channelId);
        if (!channel) {
            console.log("📢 Creating a new channel: #mtp-alerts...");
            channel = await guild.channels.create({
                name: "mtp-alerts",
                type: 0, // 0 = Text channel
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone role
                        allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
                    },
                ],
            });

            console.log(`✅ Created channel: #${channel.name}`);
        } else {
            console.log(`✅ Channel already exists: #${channel.name}`);
        }

        await channel.send("✅ Bot is now active and ready to send alerts!");
        console.log(`📤 Test message sent successfully in #${channel.name}!`);
    } catch (err) {
        console.error("❌ Error creating or sending message in channel:", err);
    }
});

client.login(token);
