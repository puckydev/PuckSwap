#!/usr/bin/env tsx

/**
 * Extract compiled Plutus scripts from plutus.json and create .plutus files
 * for deployment with Lucid Evolution
 */

import * as fs from 'fs';
import * as path from 'path';

interface PlutusValidator {
  title: string;
  compiledCode: string;
  hash: string;
  datum?: any;
  redeemer?: any;
}

interface PlutusBlueprint {
  preamble: {
    title: string;
    description: string;
    version: string;
    plutusVersion: string;
    compiler: {
      name: string;
      version: string;
    };
    license: string;
  };
  validators: PlutusValidator[];
  definitions: any;
}

async function extractPlutusScripts() {
  try {
    // Read plutus.json
    const plutusJsonPath = path.join(process.cwd(), 'plutus.json');
    if (!fs.existsSync(plutusJsonPath)) {
      console.error('❌ plutus.json not found. Run "aiken build" first.');
      process.exit(1);
    }

    const plutusBlueprint: PlutusBlueprint = JSON.parse(
      fs.readFileSync(plutusJsonPath, 'utf8')
    );

    console.log('📋 Found Plutus Blueprint:');
    console.log(`   Title: ${plutusBlueprint.preamble.title}`);
    console.log(`   Version: ${plutusBlueprint.preamble.version}`);
    console.log(`   Plutus Version: ${plutusBlueprint.preamble.plutusVersion}`);
    console.log(`   Compiler: ${plutusBlueprint.preamble.compiler.name} ${plutusBlueprint.preamble.compiler.version}`);
    console.log(`   Validators: ${plutusBlueprint.validators.length}`);

    // Create deployment/scripts directory if it doesn't exist
    const scriptsDir = path.join(process.cwd(), 'deployment', 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Mapping from Aiken validator names to deployment script names
    const validatorMapping: Record<string, string> = {
      'swap.swap.spend': 'swap_validator',
      'liquidity.liquidity.spend': 'liquidity_provision_validator',
      'simple.simple.spend': 'simple_validator',
      // Add more mappings as needed
    };

    // Extract each validator
    for (const validator of plutusBlueprint.validators) {
      // Skip 'else' handlers for now, focus on main validators
      if (validator.title.includes('.else')) {
        continue;
      }

      const mappedName = validatorMapping[validator.title] || validator.title.replace(/\./g, '_');

      // Create both JSON format (for reference) and hex format (for deployment)
      const plutusFile = {
        type: "PlutusScriptV3",
        description: `${validator.title} - ${plutusBlueprint.preamble.description}`,
        cborHex: validator.compiledCode
      };

      // Save JSON format for reference
      const jsonFileName = `${mappedName}.json`;
      const jsonFilePath = path.join(scriptsDir, jsonFileName);
      fs.writeFileSync(jsonFilePath, JSON.stringify(plutusFile, null, 2));

      // Save hex format for deployment script
      const fileName = `${mappedName}.plutus`;
      const filePath = path.join(scriptsDir, fileName);
      fs.writeFileSync(filePath, validator.compiledCode);

      console.log(`✅ Exported: ${fileName}`);
      console.log(`   Original: ${validator.title}`);
      console.log(`   Hash: ${validator.hash}`);
      console.log(`   Size: ${validator.compiledCode.length / 2} bytes`);
    }

    console.log(`\n🎉 Successfully exported ${plutusBlueprint.validators.length} validators to deployment/scripts/`);
    
    // Create a summary file
    const summary = {
      exportedAt: new Date().toISOString(),
      blueprint: plutusBlueprint.preamble,
      validators: plutusBlueprint.validators.map(v => ({
        title: v.title,
        hash: v.hash,
        file: `${v.title.replace(/\./g, '_')}.plutus`
      }))
    };

    fs.writeFileSync(
      path.join(scriptsDir, 'export-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('📄 Created export-summary.json');

  } catch (error) {
    console.error('❌ Error extracting Plutus scripts:', error);
    process.exit(1);
  }
}

// Run the extraction
extractPlutusScripts();
