import { Presets, SingleBar } from 'cli-progress'
import { createHash } from 'crypto'
import { join } from 'path'
import chalk from 'chalk'
import arg from 'arg'
import ora from 'ora'

const Qualities = ['high', 'low', 'both'] as const
type Quality = (typeof Qualities)[number]
const MediaTypes = ['image', 'video', 'both'] as const
type MediaType = (typeof MediaTypes)[number]

const args = arg({
  '--email': String,
  '--password': String,
  '--quality': String,
  '--media-types': String,
  '--directory': String
})

const email = process.env.EMAIL ?? args['--email']
const password = process.env.PASSWORD ?? args['--password']

if (!email) {
  console.error(chalk.red('Missing email.'))
  process.exit(1)
}

if (!password) {
  console.error(chalk.red('Missing password.'))
  process.exit(1)
}

if (args['--quality'] && !Qualities.includes(args['--quality'] as any)) {
  console.error(
    chalk.red(
      `Invalid quality supplied: should be one of [${Qualities.join('; ')}]`
    )
  )
  process.exit(1)
}

const quality = (args['--quality'] as Quality) ?? 'both'
const mediaType = (args['--media-types'] as MediaType) ?? 'both'
const directory = args['--directory'] ?? './dump'

const spinner = ora('Fetching questions').start()

const response = await fetch(
  `https://inetcore.fahren-lernen.de/api/GetData?Login=${encodeURIComponent(
    email
  )}&Password=${encodeURIComponent(password)}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      get: {
        questionList: true,
        mediaItemCache: true,
        questionTextLists: true,
        clientType: 'Web;Windows 10'
      }
    })
  }
)

if (response.status !== 200) {
  const error = await response.json()

  if (error.message) {
    console.error(chalk.red(`Request error: ${error.message}`))
  } else {
    console.error(chalk.red(`Request error: got ${error.resultCode}`))
  }
  process.exit(1)
}

const data = await response.json()

spinner.text = 'Saving questions'
await Bun.file('dump/questions.json').write(
  join(directory, JSON.stringify(data.questionList.questions))
)

spinner.text = 'Saving texts'
for (const language of data.questionTextLists) {
  await Bun.file(
    join(directory, `questionTexts-${language.languageKey.toLowerCase()}.json`)
  ).write(JSON.stringify(language))
}

spinner.text = 'Downloading media'

const progress = new SingleBar(
  {
    format: `${chalk.blue('[{bar}] {percentage}%')} | ${chalk.magenta(
      'ETA: {eta}s'
    )} | {value}/{total}mb`,
    hideCursor: true
  },
  Presets.shades_classic
)

const filteredMedia: Array<any> = data.mediaItemCacheList.mediaItemLists
  .filter((item: any) => {
    if (item.quality === 'Low' && quality === 'high') return false
    if (item.quality === 'High' && quality === 'low') return false
    if (mediaType === 'image' && item.mediaType !== 'QuestionImage')
      return false
    if (mediaType === 'video' && item.mediaType !== 'QuestionVideo')
      return false
    return true
  })
  .map((item: any) =>
    item.mediaItems.map((media: any) => ({
      ...media,
      quality: item.quality.toLowerCase()
    }))
  )
  .flat(1)
const totalDownloadSize = filteredMedia.reduce(
  (acc: number, item: any) => acc + item.size,
  0
)

spinner.stop()
progress.start(Math.round(totalDownloadSize / 1_000_000_0) * 10, 0)

for (const media of filteredMedia) {
  const filename = join(
    directory,
    'media',
    media.quality,
    media.url.split('/').slice(-1)[0]
  )
  if (await Bun.file(filename).exists()) {
    progress.increment(Math.round(media.size / 1_000_000_0) * 10)
    continue
  }
  const response = await fetch(media.url)
  const buffer = await response.bytes()
  const hash = createHash('md5')
  hash.update(buffer)
  const digest = hash.digest('base64')
  if (digest !== media.hash) {
    progress.stop()
    console.error(
      chalk.red(
        `Hash mismatch for media item ${media.id}: expected ${media.hash}, got ${digest}`
      )
    )
    process.exit(1)
  }
  await Bun.file(filename).write(buffer)
  progress.increment(Math.round(media.size / 1_000_000_0) * 10)
}

progress.stop()

console.log(chalk.green('Done.'))
