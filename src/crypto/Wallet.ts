import KeyEncoder from 'key-encoder';
import { ec, eddsa, } from 'elliptic';
import { HDKey } from 'ethereum-cryptography/hdkey';
import { ethers } from 'ethers';
import { HDNode } from 'ethers/utils';
import { getMasterKeyFromSeed, getPublicKey } from 'ed25519-hd-key';
import { HDKeyT } from 'ethereum-cryptography/pure/hdkey';
import { IsString, IsDefined, IsOptional } from 'class-validator';
import { JWK } from 'jose';
import {
    generateRandomSecretKey,
    deriveKeyFromMnemonic,
    deriveKeyFromEntropy,
    deriveKeyFromMaster,
    deriveEth2ValidatorKeys,
} from "@chainsafe/bls-keygen";

export class WalletOptions {
    @IsString()
    @IsDefined()
    password: string;

    @IsOptional()
    @IsString()
    mnemonic?: string;
}

export class Wallet {


    constructor(private ethersWallet: ethers.Wallet) {

    }

    /**
     * Create HD Wallet
     * @param password password to encrypt keystore
     */
    public static async createHDWallet(obj: WalletOptions) {
        // ethers
        const { password, mnemonic } = obj;       
        let wallet;
        if (password) {
            wallet = ethers.Wallet.createRandom();
        } else {
            wallet = ethers.Wallet.fromMnemonic(mnemonic);
        }
        return await wallet.encrypt(password);
    }

    /**
     * Generates a mnemonic
     */
    public static generateMnemonic() {
        return ethers.Wallet.createRandom().mnemonic;
    }

    /**
     * Unlocks a JSON keystore
     * @param keystore A JSON keystore
     * @param password password to decrypt
     */
    public static async unlock(keystore: string, password: string): Wallet {
        const ethersWallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
        return new Wallet(ethersWallet);
    }

    /**
     * Derives a new child Wallet
     */
    public deriveChild(sequence: number, derivation = `m/44'/60'/0'/0`): Wallet {
        const masterKey = HDNode.fromMnemonic(this.ethersWallet.mnemonic);
        const hdnode = masterKey.derivePath(`${derivation}/${sequence}`);
        console.log(hdnode.path, hdnode.fingerprint, hdnode.parentFingerprint);
        const ethersWallet = new ethers.Wallet(hdnode);
        return new Wallet(ethersWallet);
    }

    public get path() {
        return this.ethersWallet.path;
    }

    public get address() {
        return this.ethersWallet.getAddress();
    }

    /**
     * Derives a wallet from a path
     */
    public deriveFromPath(path: string): Wallet {
        const node = HDNode.fromMnemonic(this.ethersWallet.mnemonic).derivePath(path);
        const ethersWallet = new ethers.Wallet(node);
        return new Wallet(ethersWallet);
    }

    public getEd25519(): eddsa.KeyPair {
        const ed25519 = new eddsa('ed25519');
       // const hdkey = HDKey.fromExtendedKey(HDNode.fromMnemonic(this.ethersWallet.mnemonic).extendedKey);
        const { key, chainCode } = getMasterKeyFromSeed(ethers.utils.HDNode.mnemonicToSeed(this.ethersWallet.mnemonic));
        const keypair = ed25519.keyFromSecret(key);
        return keypair;
    }

    public getP256(): ec.KeyPair {
        const { HDKey } = require('hdkey-secp256r1');
        const p256 = new ec('p256');
       // const hdkey = HDKey.fromExtendedKey(HDNode.fromMnemonic(this.ethersWallet.mnemonic).extendedKey);
        const key = HDKey.fromMasterSeed(Buffer.from(HDNode.mnemonicToSeed(this.ethersWallet.mnemonic), 'hex'))
        const keypair = p256.keyFromPrivate(key.privateKey);
        return keypair;
    }

    public getES256K(): ec.KeyPair {
        const ES256k = new ec('secp256k1');
        const key = HDKey.fromMasterSeed(Buffer.from(HDNode.mnemonicToSeed(this.ethersWallet.mnemonic), 'hex'))
        const keypair = ES256k.keyFromPrivate(key.privateKey);
        return keypair;
    }
    
    public getBlsMasterKey(): any {
        const masterKey = deriveKeyFromMnemonic(this.ethersWallet.mnemonic)
        return {
            deriveValidatorKeys: (id: number) => deriveEth2ValidatorKeys(masterKey, id)
        };
    }


    public getRSA2048Standalone(): Promise<JWK.RSAKey> {
        return JWK.generate("RSA");
    }

    
}
