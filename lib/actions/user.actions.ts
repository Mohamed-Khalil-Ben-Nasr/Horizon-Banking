'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
    APPWRITE_DATABASE_ID : DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env

export const signIn = async ({email,password}:signInProps) => {
    try {
        //Mutation - modify database - make Fetch
        const { account } = await createAdminClient();
        const response = await account.createEmailPasswordSession(email,password);
        return parseStringify(response);
    } catch (error) {
        console.error('Error', error);
    }
}

export const signUp = async ({password, ...userData}: SignUpParams) => {
    const {email, firstName, lastName} = userData;

    let newUserAccount;

    try {
        //Mutation - modify database - make Fetch
        // use appwrite to create user account
        const { account, database } = await createAdminClient();
        
        newUserAccount = await account.create(
            ID.unique(),  
            email, 
            password,
            `${firstName} ${lastName}`
        );

        if(!newUserAccount) throw new Error('Error creating user');

        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: 'personal'
        })

        if (!dwollaCustomerUrl) throw new Error('Error creating dwolla customer');
 
        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        const newUser = await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl
            }
        )

        const session = await account.createEmailPasswordSession(email, password);

        cookies().set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(newUser);
    } catch (error) {
        console.error('Error', error);
    }
}

// ... your initilization functions

export async function getLoggedInUser() {
    try {
      const { account } = await createSessionClient();
      const user = await account.get();
      return parseStringify(user);
    } catch (error) {
      return null;
    }
  }

export const logoutAccount = async () => {
    try{
        const {account} = await createSessionClient();
        cookies().delete('appwrite-session');
        await account.deleteSession('current');
    } catch(error){
        return null;
    }
}
  
export const createLinkToken = async (user: User) => {
    try{
        const tokenParams = {
            user: {
                client_user_id: user.$id,
            },  
            client_name: `${user.firstName} ${user.lastName}`,
            products: ['auth'] as Products[],
            language: 'en',
            country_codes: ['US'] as CountryCode[],
        }

        const response = await plaidClient.linkTokenCreate(tokenParams);



        return parseStringify({linkToken: response.data.link_token})
    }catch(error: any) {
        console.error('Error creating link token:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        console.error('Error config:', error.config);
    }
}

export const createBankAccount = async({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    sharableId,
}: createBankAccountProps) => {
    try{
        // we are creating a bank account in appwrite (our backend)
        const {database} = await createAdminClient();

        const bankAccount = await database.createDocument(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            ID.unique(),
            {
                userId,
                bankId,
                accountId,
                accessToken,
                fundingSourceUrl,
                sharableId,
            }
        ); 
        
        return parseStringify(bankAccount);
    } catch(error){
        console.log('error while creating bank account on appwrite', error);
    }
}

export const exchangePublicToken = async (
    {
        publicToken,
        user
    }: exchangePublicTokenProps
) => {
    try {
        //exchange public token for access token and item ID
        const response = await plaidClient.
        itemPublicTokenExchange({
            public_token: publicToken,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        //get account information from plaid using the access token
        const accountsResponse = await plaidClient.accountsGet
        ({
            access_token:accessToken,
        });

        const accountData = accountsResponse.data.accounts[0];

        //create a processor token for dwolla using the access token and account ID
        const request: ProcessorTokenCreateRequest = {
            access_token: accessToken,
            account_id: accountData.account_id,
            processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
        };

        const processorTokenResponse = await plaidClient.processorTokenCreate(request);
        const processorToken = processorTokenResponse.data.processor_token;

        //create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken,
            bankName: accountData.name,
        });

        if (!fundingSourceUrl) throw Error;

        //create a bank account using the user ID, item ID, account ID, access token, funding source URL, and sharable ID
        //server action to be created soon
        await createBankAccount({
            userId: user.$id,
            bankId: itemId,
            accountId: accountData.account_id,
            accessToken,
            fundingSourceUrl,
            sharableId: encryptId(accountData.account_id),
        });

        revalidatePath('/');

        //return a success message
        return parseStringify({
            publicTokenExchange: "complete",
        });

    } catch (error) {
        console.error('An error occured while creating exchanging token: ', error);
    }
}