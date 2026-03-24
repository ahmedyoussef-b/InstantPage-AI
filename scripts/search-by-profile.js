// scripts/search-by-profile.js
// Recherche de documents par profil utilisateur

const { ChromaClient } = require('chromadb');

const client = new ChromaClient({ path: "http://localhost:8000" });
const COLLECTION_NAME = "CENTRALE_DOCUMENTS";

async function searchByProfile(query, profile) {
    console.log(`\n🔍 Recherche pour ${profile}: "${query}"`);
    
    const collection = await client.getCollection({ name: COLLECTION_NAME });
    
    const results = await collection.query({
        queryTexts: [query],
        nResults: 5,
        where: { target_profile: profile }
    });
    
    return results;
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const query = args[1];
    const profile = args[2];
    
    if (command === 'search' && query && profile) {
        const results = await searchByProfile(query, profile);
        if (results.documents && results.documents[0]) {
            results.documents[0].forEach((doc, i) => {
                console.log(`\n${i+1}. ${doc.substring(0, 200)}...`);
                if (results.metadatas[0][i]) {
                    console.log(`   Source: ${results.metadatas[0][i].source}`);
                    console.log(`   Tags: ${results.metadatas[0][i].tags}`);
                }
            });
        }
    } else {
        console.log("Usage: node search-by-profile.js search <query> <profile>");
        console.log("Profiles: chef_quart, chef_bloc_TG1, operateur_terrain, maintenance, superviseur");
    }
}

main();
