async function main() {
    await loadPyodide({indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.17.0/full/'});
    pyodide.runPython(`import js\nfrom pyodide.console import _InteractiveConsole\njs.pyconsole = _InteractiveConsole()`, pyodide.globals.get("dict")());
    async function lock(){
      let resolve, ready = term.ready;
      term.ready = new Promise(res => resolve = res);
      await ready;
      return resolve;
    }
    async function interpreter(command) {
      let unlock = await lock();
      try {
        term.pause();
        for(const c of command.split('\n')) {
          let run_complete = pyconsole.run_complete;
          try {
              const incomplete = pyconsole.push(c);
              term.set_prompt(incomplete ? '... ' : '>>> ');
              let r = await run_complete;
              if(pyodide.isPyProxy(r)) r.destroy();
            } catch(e) {
              if(e.name !== "PythonError"){
                term.error(e);
                throw e;
              }
            }
            run_complete.destroy();
        }
      } finally {
        term.resume();
        unlock();
      }
    }
    let term = $('body').terminal(
      interpreter,
      {
        greetings: pyconsole.banner(),
        prompt: '>>> ',
        completionEscape: false,
        completion: function(command, callback) {
          callback(pyconsole.complete(command).toJs()[0]);
        }
      }
    );
    window.term = term;
    pyconsole.stdout_callback = s => term.echo(s, {newline : false});
    pyconsole.stderr_callback = s => {term.error(s.trimEnd());}
    term.ready = Promise.resolve();
}
window.console_ready = main();
