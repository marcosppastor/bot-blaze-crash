import chalk from "chalk";
import { appConfig, formatDate } from "../util/index.mjs";

export class Simulator {
	constructor(protection) {
		this.protection = protection;

		this.minimumBetAmount = Number(appConfig("minimumBetAmount", 0.1));

		this.initialBalance = Number(appConfig("initialBalance", 50));
		this.currentBalance = this.initialBalance;

		this.betAmount = Number(appConfig("betAmount", 0.1));
		this.autoCrashAt = Number(appConfig("autoCrashAt", 1.2));

		this.betNetProfitAmount = Number(appConfig("betNetProfitAmount", 0.03));

		this.totalBetAmount = 0;
		this.previousBetAmount = 0;
		this.totalCurrentGaleBetAmount = Number(appConfig("betAmount", 0.1));

		this.currentBetColor = this.betAmount;

		this.pauseBet = false;

		this.isGale = false;
		this.galeStep = 0;
		this.galeDelay = Number(appConfig("galeDelay", 3));

		this.maxGales = Number(appConfig("maxGales", 5));
	}

	instanceAutoBet(autoBet) {
		this.autoBet = autoBet;
	}

	setInitialData(data) {
		this.initialBalance = data?.balance;
		this.currentBalance = data?.balance;

		this.betAmount = data?.betAmount || 0.1;
		this.betNetProfitAmount = data?.betNetProfitAmount || 0.03;

		this.autoCrashAt = data?.autoCrashAt || 1.2;

		this.currentBetColor = this.betAmount;

		console.log(
			chalk.cyan(`[${formatDate(new Date())}]`),
			chalk.yellow("AutoBet:"),
			`Banca inicial: ${chalk.yellow(`R$${data?.balance.toFixed(2)}`)}`
		);
		console.log(
			chalk.cyan(`[${formatDate(new Date())}]`),
			chalk.yellow("AutoBet:"),
			`Aposta inicial: [${chalk.yellow(`R$ ${data?.betAmount.toFixed(2)}`)}]`
		);

		const stopLoss = this.initialBalance * Number(appConfig("stopLoss", 0.15));
		console.log(
			chalk.cyan(`[${formatDate(new Date())}]`),
			chalk.yellow("AutoBet:"),
			`Stop Loss: ${chalk.yellow(`R$${stopLoss.toFixed(2)}`)}`
		);

		const stopWin = this.initialBalance * Number(appConfig("stopWin", 1.5));
		console.log(
			chalk.cyan(`[${formatDate(new Date())}]`),
			chalk.yellow("AutoBet:"),
			`Stop Win: ${chalk.yellow(`R$${stopWin.toFixed(2)}`)}`
		);
	}

	async makeBet(lastCrashPoint) {
		if (this.pauseBet) {
			console.log(
				chalk.cyan(`[${formatDate(new Date())}]`),
				chalk.yellow("AutoBet:"),
				`Aposta pausada!`
			);
			return;
		}

		// // if current gale is 1, await 3 plays to start gale again
		// if (this.galeStep && (this.galeStep === 1 || this.galeStep === 2)) {
		// 	console.log(
		// 		chalk.cyan(`[${formatDate(new Date())}]`),
		// 		chalk.yellow("AutoBet:"),
		// 		chalk.red(`Aguardando ${chalk.redBright(this.galeDelay)} ${this.galeDelay <= 1 ? 'jogo' : 'jogos'} para iniciar a gale...`)
		// 	);

		// 	// reduce 1 gale delay
		// 	this.galeDelay--;

		// 	// if gale delay is 0, reset gale delay and unpause bet
		// 	if (this.galeDelay === 0) {
		// 		this.galeDelay = Number(appConfig("galeDelay", 3));
		// 	} else {
		// 		return;
		// 	}
		// }

		// verifica se a aposta anterior foi gale
		if (lastCrashPoint) this.isGale = Boolean(lastCrashPoint < this.autoCrashAt);

		// define o valor da aposta anterior ou inicial
		this.previousBetAmount = this.betAmount;

		if (this.isGale) {
			// se for gale, incrementa o passo da gale
			this.galeStep++;

			// se não alcançar o máximo de gales, aumenta a aposta (regra abaixo)
			if (this.galeStep <= this.maxGales) {
				// se tiver "proteção", o valor é alterado conforme a lógica abaixo
				if (this.protection) {
					// valor da próxima aposta
					this.betAmount = parseFloat((this.betAmount * 2).toFixed(2));

					// valor do crash para a próxima aposta
					this.autoCrashAt = Math.round(((this.betAmount + this.totalCurrentGaleBetAmount + this.betNetProfitAmount) / this.betAmount) * 100) / 100;
				}
			}
		}

		// se não for ou alcançar o máximo de gales, reseta a aposta
		if (!this.isGale || this.galeStep > this.maxGales) this.resetBet();

		try {
			setTimeout(async () => {
				await this.autoBet.placeBet(this.betAmount, this.autoCrashAt);
				this.currentBalance -= this.betAmount;
				this.totalBetAmount += parseFloat((this.betAmount).toFixed(2));
				if (this.isGale) this.totalCurrentGaleBetAmount += parseFloat((this.betAmount).toFixed(2));

				console.log(
					chalk.cyan(`[${formatDate(new Date())}]`),
					chalk.yellow("AutoBet:"),
					`Nova aposta: [${chalk.yellow(`R$ ${this.betAmount.toFixed(2)}`)} | ${chalk.yellow(`${this.autoCrashAt}x`)}${chalk.yellow(`${this.galeStep > 0 ? ` | gale ${this.galeStep}` : ''}`)}]`
				);

				console.log(
					chalk.cyan(`[${formatDate(new Date())}]`),
					chalk.yellow("AutoBet:"),
					`Banca atual: [${this.currentBalance <= 0 ? chalk.red(`R$ ${this.currentBalance.toFixed(2)}`) : chalk.green(`R$ ${this.currentBalance.toFixed(2)}`)}]`
				);

				// se "totalBetAmount" for 20% maior que a banca inicial, reseta a aposta
				// if (this.totalBetAmount >= this.currentBalance * 1.2) {
				// 	console.log(
				// 		chalk.cyan(`[${formatDate(new Date())}]`),
				// 		chalk.yellow("AutoBet:"),
				// 		`Valor total gasto até o momento: [${this.totalBetAmount >= this.currentBalance * 1.2 ? chalk.red(`R$ ${this.totalBetAmount.toFixed(2)}`) : chalk.green(`R$ ${this.totalBetAmount.toFixed(2)}`)}]`
				// 	);
				// }
			}, 3000);
			// }, (!isGale ? 3 : 12) * 1000); // original
		} catch (error) {
			console.log('error', error)
			return { status: "error", message: error };
		}
	}

	async storeResult(lastCrashPoint) {
		if (this.pauseBet) return;
		// if (this.pauseBet || (this.galeStep && (this.galeStep === 1 || this.galeStep === 2))) return;

		// if (type === "loss") {
		// 	this.totalLosses++;

		const stopLoss = this.initialBalance * Number(appConfig("stopLoss", 0.15));
		if (this.currentBalance <= stopLoss && !this.pauseBet) {
			this.pauseBet = true;
			console.log(
				chalk.cyan(`[${formatDate(new Date())}]`),
				chalk.yellow("AutoBet:"),
				`Stop Loss atingido!`
			);

			const stopLossTime = appConfig('stopLossTime', 5);
			setTimeout(async () => {
				this.setInitialData({
					balance: this.currentBalance,
					betAmount: Number(appConfig("betAmount", 0.4)),
				});
				console.log(
					chalk.cyan(`[${formatDate(new Date())}]`),
					chalk.yellow("AutoBet:"),
					`Stop Loss desativado!`
				);

				// Remove a proteção caso o stop loss seja atingido
				this.pauseBet = false;
			}, stopLossTime * (60 * 1000));
		}
		// } else {

		let profit = 0;

		if (lastCrashPoint >= this.autoCrashAt) {
			profit = parseFloat((this.betAmount * this.autoCrashAt).toFixed(2));
		}
		this.currentBalance += profit;
		console.log(
			chalk.cyan(`[${formatDate(new Date())}]`),
			chalk.yellow("AutoBet:"),
			`Profit: ${profit.toFixed(2) <= 0 ? chalk.red(`R$ ${profit.toFixed(2)}`) : chalk.green(`R$ ${profit.toFixed(2)}`)}`
		);

		const stopWin = this.initialBalance * Number(appConfig("stopWin", 1.5));
		if (this.currentBalance >= stopWin && !this.pauseBet) {
			this.pauseBet = true;
			console.log(
				chalk.cyan(`[${formatDate(new Date())}]`),
				chalk.yellow("AutoBet:"),
				`Stop Win atingido!`
			);

			const stopWinTime = appConfig('stopWinTime', 5);
			setTimeout(async () => {
				this.setInitialData({
					balance: this.currentBalance,
					betAmount: Number(appConfig("betAmount", 5.1)),
				});
				console.log(
					chalk.cyan(`[${formatDate(new Date())}]`),
					chalk.yellow("AutoBet:"),
					`Stop Win desativado!`
				);
				this.pauseBet = false;
			}, stopWinTime * (60 * 1000));
		}
		// }

		if (Boolean(appConfig("allowAutoBet"))) await this.reloadBalance();

		console.log(
			chalk.cyan(`[${formatDate(new Date())}]`),
			chalk.yellow("AutoBet:"),
			`Banca atual: ${this.currentBalance.toFixed(2) <= 0 ? chalk.red(`R$${this.currentBalance.toFixed(2)}`) : chalk.green(`R$${this.currentBalance.toFixed(2)}`)}`
		);
	}

	async reloadBalance() {
		await this.autoBet.balance();
		this.currentBalance = Number(this.autoBet.wallet?.balance || 0);
	}

	resetBet() {
		this.isGale = false;
		this.galeStep = 0;
		this.betAmount = Number(appConfig("betAmount", 0.1));
		this.autoCrashAt = Number(appConfig("autoCrashAt", 1.2));
		this.totalCurrentGaleBetAmount = Number(appConfig("betAmount", 0.1));
	}
}
