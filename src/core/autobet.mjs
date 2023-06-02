import chalk from "chalk";
import request from "request-promise";
import { appConfig, getColorNameOrEmoticon } from "../util/index.mjs";

export class AutoBet {
	async start() {
		this.account = await this.loadAccount();
		this.country = await this.loadCountry();
		await this.balance();
	}

	async balance() {
		const wallets = await this.loadWallet();
		this.wallet = wallets.find(
			(w) => w.currency_type === this.country?.currency_type
		);
	}

	async loadAccount() {
		try {
			return request.get(process.env.BASE_URL + "/api/users/me", {
				json: true,
				headers: { authorization: "Bearer " + process.env.BLAZE_TOKEN },
			});
		} catch (err) {
			return { status: false, error: err.message };
		}
	}

	async loadWallet() {
		try {
			return request.get(process.env.BASE_URL + "/api/wallets", {
				json: true,
				headers: { authorization: "Bearer " + process.env.BLAZE_TOKEN },
			});
		} catch (err) {
			return { status: false, error: err.message };
		}
	}

	async loadCountry() {
		try {
			return request.get(process.env.BASE_URL + "/api/country", {
				json: true,
				headers: { authorization: "Bearer " + process.env.BLAZE_TOKEN },
			});
		} catch (err) {
			return { status: false, error: err.message };
		}
	}

	async placeBet(amount, autoCrashAt) {
		if (!Boolean(appConfig("allowAutoBet"))) return;

		try {
			const data = await request.post(
				process.env.BASE_URL + "/api/crash/round/enter",
				{
					headers: { authorization: "Bearer " + process.env.BLAZE_TOKEN },
					json: true,
					body: {
						amount,
						type: "BRL",
						free_bet: false,
						wallet_id: this.wallet?.id,
						auto_cashout_at: autoCrashAt,
						currency_type: this.wallet?.currency_type
					},
				}
			);

			// console.log(
			// 	chalk.cyan(`[${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'})}]`),
			// 	chalk.yellow("AutoBet:"),
			// 	chalk.cyan(`Aposta realizada com sucesso (R$ ${amount.toFixed(2)} | ${autoCrashAt}x)!`)
			// );

			return { status: true, error: null, response: data };
		} catch (err) {
			console.log(
				chalk.cyan(`[${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'})}]`),
				chalk.yellow("AutoBet:"),
				chalk.red(`Falha ao apostar (R$ ${amount.toFixed(2)} | ${autoCrashAt}x)`)
			);
			return { status: false, error: err.message };
		}
	}
}
