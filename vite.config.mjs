import { defineConfig, loadEnv } from 'vite';
import { handleRequest } from './worker/index.js';
export default defineConfig(({mode}) => {
  const env = loadEnv(mode,process.cwd(),'');
  return {
    root:'public',
    server:{host:'0.0.0.0',allowedHosts:['terminal.local']},
    plugins:[{
      name:'sitesync-consultation-preview',
      configureServer(server) {
        server.middlewares.use('/__qa', (req,res) => {
          res.setHeader('Content-Type','text/html');
          res.end('<!doctype html><html><title>Responsive SiteSync check</title><body style="margin:0;background:#171d19;color:white;font-family:Arial"><h1 style="font-size:18px;padding:12px">SiteSync mobile layout · 390px</h1><iframe title="SiteSync mobile preview" src="/" style="display:block;width:390px;height:844px;border:1px solid #415646;margin:0 auto"></iframe></body></html>');
        });
        server.middlewares.use('/api/consultation',async(req,res,next)=> {
          try {
            const buffers=[];
            for await (const chunk of req) {
              buffers.push(chunk);
              if (buffers.reduce((sum,value)=>sum+value.length,0)>20000) {res.writeHead(413);res.end();return;}
            }
            const request = new Request(`http://${req.headers.host}/api/consultation`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(buffers)}:{})});
            const response = await handleRequest(request,env);
            res.writeHead(response.status,Object.fromEntries(response.headers));
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch(error) { next(error); }
        });
      }
    }]
  };
});
