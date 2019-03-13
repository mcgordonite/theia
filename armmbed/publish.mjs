// tslint:disable
import fs from 'fs';
import child_process from 'child_process';
import path from 'path';

const readFile = filePath => new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

const writeFile = (filePath, content) => new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, err => {
        if (err) reject(err);
        else resolve();
    });
});

const dirExists = dir => new Promise((resolve, reject) => {
    fs.access(dir, err => {
        if (err) {
            if (err.code === 'ENOENT') resolve(false);
            else reject(err);
        } else {
            resolve(true);
        }
    });
});

const runYarn = (args = [], cwd = null) => new Promise((reject, resolve) => {
    child_process.exec(['yarn', ...args].join(' '), { cwd }, (error, stdout) => {
        if (error) {
            reject(error);
        } else {
            resolve(stdout);
        }
    });
});

const modifyJsonFile = (filePath, modify) => readFile(filePath)
    .then(contentJson => JSON.stringify(modify(JSON.parse(contentJson)), null, 2) + '\n')
    .then(modified => writeFile(filePath, modified));

const main = args => {
    const packageName = args[0];
    const version = args[1];

    if (!packageName || !version) {
        console.log('Usage: node --experimental-modules publish.mjs <packageName> <version>');
        process.exit(1);
    }

    console.log(`Publishing package ${packageName} at version ${version}`);

    const prodPackageDir = path.resolve(process.cwd(), 'packages', packageName);
    const devPackageDir = path.resolve(process.cwd(), 'dev-packages', packageName);

    Promise.all([
        dirExists(prodPackageDir),
        dirExists(devPackageDir)
    ]).then(
        ([prodPackageDirExists, devPackageDirExists]) => {
            if (prodPackageDirExists || devPackageDirExists) {
                let packageDir;

                if (prodPackageDirExists) {
                    console.log('Identified as a production package');
                    packageDir = prodPackageDir;
                } else {
                    console.log('Identified as a dev package');
                    packageDir = devPackageDir;
                }

                const packageJsonPath = path.join(packageDir, 'package.json');

                return modifyJsonFile(
                    packageJsonPath,
                    current => ({
                        ...current, name: `@mcgordonite/theia-${packageName}`, version, repository: {
                            "type": "git",
                            "url": "https://github.com/mcgordonite/theia.git"
                        }
                    })
                ).then(() => runYarn(['publish', '--new-version', version], packageDir)).then(
                    () => {
                        console.log("Done");
                        process.exit(0);
                    },
                    error => {
                        console.error(error);
                        process.exit(2);
                    }
                );
            } else {
                console.error('Could not find package');
                process.exit(1);
            }
        },
        error => {
            console.error(error);
            process.exit(2);
        }
    );
};

main(process.argv.slice(2));
