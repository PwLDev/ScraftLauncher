import { login, offline, Authentication , lookup, GameProfile, setTexture } from "@xmcl/user";
import { launch , MinecraftLocation } from "@xmcl/core";
import { getVersionList, MinecraftVersion, install } from "@xmcl/installer";

const co = async () => {
	const minecraft: MinecraftLocation = "../.minecraft";
	const list: MinecraftVersion[] = (await getVersionList()).versions;

	const aVersion: MinecraftVersion = list[250]; // i just pick the first version in list here
	await install(aVersion, minecraft);
};

co();