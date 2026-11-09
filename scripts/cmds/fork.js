const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
	config: {
		name: "fork",
		aliases: ["ফ্রক", "গিটহাব"],
		version: "4.0",
		author: "𝐒𝐈𝐘𝐀𝐌-𝐇𝐀𝐒𝐀𝐍",
		countDown: 0,
		role: 0,
		shortDescription: {
			bn: "বটের ফোর্ক লিঙ্ক ও আপডেট দেখাবে"
		},
		longDescription: {
			bn: "বটের আপডেট ফোর্ক গিটহাব লিঙ্ক সবাইকে মেনশন দিয়ে নোটিফিকেশন পাঠাবে"
		},
		category: "info",
		guide: {
			bn: ""
		}
	},

	onStart: async function ({ api, event, Threads }) {
		return await module.exports.sendForkUpdate({ api, event, Threads });
	},

	onChat: async function ({ api, event, Threads }) {
		const { body } = event;
		if (!body) return;

		const text = body.toLowerCase();

		// যেকোনো লেখার শুরুতে, মাঝে বা শেষে থাকলে এবং বড়/ছোট হাতের বা বাংলা/ইংরেজি যেকোনো ফরম্যাটে থাকলেও ট্রিগার হবে
		const triggerRegex = /(fork|ফোর্ক|Fork|github|গিটহাব)/i;

		if (triggerRegex.test(text)) {
			return await module.exports.sendForkUpdate({ api, event, Threads });
		}
	},

	sendForkUpdate: async function ({ api, event, Threads }) {
		const { threadID, messageID } = event;
		const videoUrl = "https://files.catbox.moe/lda9ep.mp4";
		const cacheDir = path.join(__dirname, "cache");
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}
		const videoPath = path.join(cacheDir, `fork_video_${Date.now()}.mp4`);

		try {
			// ভিডিও ডাউনলোড করে ক্যাশ ফোল্ডারে সেভ করা হচ্ছে
			const response = await axios({
				method: 'GET',
				url: videoUrl,
				responseType: 'stream'
			});

			const writer = fs.createWriteStream(videoPath);
			response.data.pipe(writer);

			await new Promise((resolve, reject) => {
				writer.on('finish', resolve);
				writer.on('error', reject);
			});

			let threadInfo;
			if (Threads && typeof Threads.getInfo === "function") {
				threadInfo = await Threads.getInfo(threadID);
			} else if (api && typeof api.getThreadInfo === "function") {
				threadInfo = await api.getThreadInfo(threadID);
			}

			let participantIDs = [];
			if (threadInfo) {
				if (Array.isArray(threadInfo.participantIDs) && threadInfo.participantIDs.length > 0) {
					participantIDs = threadInfo.participantIDs;
				} else if (Array.isArray(threadInfo.userInfo) && threadInfo.userInfo.length > 0) {
					participantIDs = threadInfo.userInfo.map(u => u.id || u.facebookID);
				}
			}

			const mentionTag = "🚨 𝐍𝐄𝐖 𝐅𝐎𝐑𝐊 𝐔𝐏𝐃𝐀𝐓𝐄";

			const mentions = participantIDs.map(id => ({
				id: id,
				tag: mentionTag
			}));

			const messageBody = 
`${mentionTag}
➤ 𝐍𝐞𝐰 𝐅𝐮𝐧 & 𝐔𝐬𝐞𝐟𝐮𝐥 𝐂𝐌𝐃𝐒 
😼 𝐔𝐒𝐄 𝐈𝐓
😁 𝐓𝐇𝐄𝐍 𝐊𝐍𝐎𝐖! 

🔗 𝐆𝐢𝐭𝐇𝐮𝐛
https://github.com/siyamxpro/siyamxpro.git`;

			return api.sendMessage({
				body: messageBody,
				attachment: fs.createReadStream(videoPath),
				mentions: mentions.length > 0 ? mentions : []
			}, threadID, () => {
				// মেসেজ পাঠানোর পর ক্যাশ থেকে ভিডিও ফাইল ডিলিট করে দেওয়া
				if (fs.existsSync(videoPath)) {
					fs.unlinkSync(videoPath);
				}
			}, messageID);

		} catch (error) {
			console.error("Fork Command Error:", error);
			if (fs.existsSync(videoPath)) {
				fs.unlinkSync(videoPath);
			}

			const fallbackBody = 
`🚨 𝐍𝐄𝐖 𝐅𝐎𝐑𝐊 𝐔𝐏𝐃𝐀𝐓𝐄
➤ 𝐍𝐞𝐰 𝐅𝐮𝐧 & 𝐔𝐬𝐞𝐟𝐮𝐥 𝐂𝐌𝐃𝐒 
😼 𝐔𝐒𝐄 𝐈𝐓
🤮 𝐓𝐇𝐄𝐍 𝐊𝐍𝐎𝐖! 

🔗 𝐆𝐢𝐭𝐇𝐮𝐛
https://github.com/siyamxpro/siyamxpro.git`;

			// যদি কোনো কারণে ভিডিও ডাউনলোড ফেইল করে, তবুও যেন ভিডিও ছাড়া টেক্সট ও লিংক চলে যায়
			try {
				const responseVideo = await axios({
					method: 'GET',
					url: videoUrl,
					responseType: 'stream'
				});
				const writerFallback = fs.createWriteStream(videoPath);
				responseVideo.data.pipe(writerFallback);
				await new Promise((resolve, reject) => {
					writerFallback.on('finish', resolve);
					writerFallback.on('error', reject);
				});

				const res = await api.sendMessage({
					body: fallbackBody,
					attachment: fs.createReadStream(videoPath)
				}, threadID, () => {
					if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
				}, messageID);
				return res;
			} catch (e) {
				if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
				return api.sendMessage(fallbackBody, threadID, messageID);
			}
		}
	}
};
