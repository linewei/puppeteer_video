const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const record = async function(options) {
  const browser = options.browser || (await puppeteer.launch());
  const page = options.page || (await browser.newPage());

  await options.prepare(browser, page);

  var ffmpegPath = options.ffmpeg || 'ffmpeg';
  var fps = options.fps || 60;

  var outFile = options.output;

  const args = ffmpegArgs(fps);

  if ('format' in options) args.push('-f', options.format);
  else if (!outFile) args.push('-f', 'matroska');

  args.push(outFile || '-');

	const ffmpeg = spawn(ffmpegPath, args);
	ffmpeg.stdout.pipe(process.stdout);
	ffmpeg.stderr.pipe(process.stderr);

	ffmpeg.on('close',(code)=>{
		console.log("ffmpeg exit! code: ",code);
	});

  for (let i = 1; i <= options.frames; i++) {
    if (options.logEachFrame)
      console.log(
        `[puppeteer-recorder] rendering frame ${i} of ${options.frames}.`
      );

    await options.render(browser, page, i);

    let screenshot = await page.screenshot({ omitBackground: true });

    await write(ffmpeg.stdin, screenshot).catch(e=>{console.log(e)});
  }

  ffmpeg.stdin.end();
};

const ffmpegArgs = fps => [
  '-y',
  '-f',
  'image2pipe',
  '-r',
  `${+fps}`,
  '-i',
  '-',
  '-c:v',
  'libvpx',
  '-auto-alt-ref',
  '0',
  '-pix_fmt',
  'yuva420p',
  '-metadata:s:v:0',
  'alpha_mode="1"'
];

const write = (stream, buffer) =>
  new Promise((resolve, reject) => {
    stream.write(buffer, error => {
      if (error) reject(error);
      else resolve();
    });
  });

(async() =>{
	const browser = await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true});
	const page = await browser.newPage();
	page.goto('./video.html');

	await record({
		browser: browser, // Optional: a puppeteer Browser instance,
		page: page, // Optional: a puppeteer Page instance,
		output: 'output1.webm',
		fps: 30,
		frames: 60 * 20, // 5 seconds at 60 fps
		ffmpeg: 'ffmpeg-git-20190925-i686-static/ffmpeg',
		prepare: function (browser, page) { /* executed before first capture */ },
		render: function (browser, page, frame) { /* executed before each capture */ }
	});
})();
