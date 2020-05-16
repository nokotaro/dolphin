/**
 * ユーザーが設定する必要のある情報
 */
export type Source = {
	name?: string;
	maintainerName?: string;
	maintainerEmail?: string;
	swPublicKey?: string;
	swPrivateKey?: string;
	url: string;
	port: number;
	https?: { [x: string]: string };
	disableHsts?: boolean;
	db: {
		host: string;
		port: number;
		db: string;
		user: string;
		pass: string;
		disableCache?: boolean;
		extra?: { [x: string]: string };
	};
	redis: {
		host: string;
		port: number;
		pass: string;
		db?: number;
		prefix?: string;
	};
	drive: {
		storage: string;
		bucket?: string;
		prefix?: string;
		baseUrl?: string;
		endpoint?: string;
		port?: number;
		useSSL?: boolean;
		accessKey?: string;
		secretKey?: string;
		region?: string;
	};

	proxy?: string;
	proxySmtp?: string;
	summalyProxy?: string;
	recaptchaSiteKey?: string;
	recaptchaSecretKey?: string;

	accesslog?: string;

	clusterLimit?: number;

	id: string;

	deliverJobConcurrency?: number;
	inboxJobConcurrency?: number;
	deliverJobPerSec?: number;
	inboxJobPerSec?: number;
	deliverJobMaxAttempts?: number;
	inboxJobMaxAttempts?: number;

	syslog: {
		host: string;
		port: number;
	};
};

/**
 * Dolphinが自動的に(ユーザーが設定した情報から推論して)設定する情報
 */
export type Mixin = {
	name: string;
	host: string;
	hostname: string;
	scheme: string;
	wsScheme: string;
	apiUrl: string;
	wsUrl: string;
	authUrl: string;
	driveUrl: string;
	userAgent: string;
};

export type Config = Source & Mixin;
