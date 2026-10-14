import { CryptoDigestAlgorithm, digest, getRandomValues } from "expo-crypto";
import { Platform } from "react-native";

// Supabase's PKCE implementation expects WebCrypto. Hermes has TextEncoder,
// but needs native secure randomness and SHA-256 rather than its plain fallback.
if (Platform.OS !== "web") {
	const crypto = globalThis.crypto ?? {};
	if (!crypto.getRandomValues)
		Object.defineProperty(crypto, "getRandomValues", {
			value: getRandomValues,
		});
	if (!crypto.subtle)
		Object.defineProperty(crypto, "subtle", {
			value: {
				digest: (algorithm: string, data: BufferSource) => {
					if (algorithm !== "SHA-256")
						throw new Error("Unsupported digest algorithm");
					return digest(CryptoDigestAlgorithm.SHA256, data);
				},
			},
		});
	if (!globalThis.crypto)
		Object.defineProperty(globalThis, "crypto", { value: crypto });
}
