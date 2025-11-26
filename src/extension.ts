import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('google-cpp-style');
    context.subscriptions.push(diagnosticCollection);

    let disposable = vscode.commands.registerCommand('checkcodestyle', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'cpp') {
            vscode.window.showInformationMessage('This command is only for C++ files.');
            return;
        }

        const text = document.getText();
        const diagnostics: vscode.Diagnostic[] = [];

        const lines = text.split('\n');
        
        const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
        const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
        const kConstRegex = /^k[A-Z][a-zA-Z0-9]*$/;

        const typeKeywords = [
            'int', 'double', 'float', 'char', 'void', 'bool', 'short', 'long', 
            'unsigned', 'signed', 'auto', 'string', 'std::string'
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line || line.startsWith('//') || line.startsWith('/*')) {
                continue;
            }

            for (const type of typeKeywords) {
                if (line.includes(type)) {
                    const isConst = line.includes('const');
                    
                    const patterns = [
                        new RegExp(`\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_]*)`),
                        new RegExp(`const\\s+${type}\\s+([a-zA-Z_][a-zA-Z0-9_]*)`),
                        new RegExp(`\\b${type}\\s+const\\s+([a-zA-Z_][a-zA-Z0-9_]*)`)
                    ];

                    for (const pattern of patterns) {
                        const match = pattern.exec(line);
                        if (match) {
                            const name = match[1];
                            
                            if (!line.includes('(') || line.indexOf('(') > line.indexOf(name) + name.length) {
                                if (isConst) {
                                    if (!kConstRegex.test(name)) {
                                        const start = line.indexOf(name);
                                        diagnostics.push(
                                            new vscode.Diagnostic(
                                                new vscode.Range(i, start, i, start + name.length),
                                                `Constants should be in kConstName style: '${name}'`,
                                                vscode.DiagnosticSeverity.Warning
                                            )
                                        );
                                    }
                                } else {
                                    if (!snakeCaseRegex.test(name)) {
                                        const start = line.indexOf(name);
                                        diagnostics.push(
                                            new vscode.Diagnostic(
                                                new vscode.Range(i, start, i, start + name.length),
                                                `Variables should be in snake_case: '${name}'`,
                                                vscode.DiagnosticSeverity.Warning
                                            )
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const functionPattern = /(\b(?:int|double|float|char|void|bool|short|long|unsigned|signed|auto|std::string)\b\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:const)?\s*(?:;|\{)/;
            const functionMatch = functionPattern.exec(line);
            if (functionMatch) {
                const functionName = functionMatch[2];
                
                if (functionName === 'main') {
                    continue;
                }
                
                if (!pascalCaseRegex.test(functionName)) {
                    const start = line.indexOf(functionName);
                    diagnostics.push(
                        new vscode.Diagnostic(
                            new vscode.Range(i, start, i, start + functionName.length),
                            `Functions should be in PascalCase: '${functionName}'`,
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
            }

            const classPattern = /\b(class|struct)\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
            const classMatch = classPattern.exec(line);
            if (classMatch) {
                const className = classMatch[2];
                if (!pascalCaseRegex.test(className)) {
                    const start = line.indexOf(className);
                    diagnostics.push(
                        new vscode.Diagnostic(
                            new vscode.Range(i, start, i, start + className.length),
                            `Classes/structs should be in PascalCase: '${className}'`,
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
            }

            const controlStructureRegex = /\b(if|while|for)\(/;
            const controlMatch = controlStructureRegex.exec(line);
            if (controlMatch) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(i, controlMatch.index, i, controlMatch.index + controlMatch[0].length),
                        `Missing space after '${controlMatch[1]}' keyword`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }

            if (i > 0) {
                const prevLine = lines[i-1].trim();
                const currentLine = line;
                
                const conditionEnd = /\b(if|while|for|else)\s*\([^)]*\)\s*$/;
                const braceStart = /^\s*\{/;
                
                if (conditionEnd.test(prevLine) && braceStart.test(currentLine)) {
                    diagnostics.push(
                        new vscode.Diagnostic(
                            new vscode.Range(i, 0, i, 1),
                            'Opening brace should be on the same line as control statement',
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
            }
        }

        diagnosticCollection.set(document.uri, diagnostics);
        vscode.window.showInformationMessage(`Found ${diagnostics.length} style issues`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}