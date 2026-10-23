<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg" />
    <img src=".github/assets/banner.svg" alt="pipaya marketplace" width="100%" />
  </picture>

  <p><a href="README.md">English</a> · <b>한국어</b></p>

  <p>
    <a href="https://github.com/dohwi/pipaya" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Made_for-pipaya-F08A24?style=flat-square" alt="pipaya" /></a>
    <a href="https://bun.sh" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Bun-1.3-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun" /></a>
    <a href="https://www.typescriptlang.org" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://github.com/dohwi/pipaya-marketplace/actions/workflows/validate.yml" target="_blank" rel="noreferrer"><img src="https://img.shields.io/github/actions/workflow/status/dohwi/pipaya-marketplace/validate.yml?branch=main&style=flat-square&label=validate" alt="validate" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" /></a>
  </p>
</div>

[pipaya](https://github.com/dohwi/pipaya) 확장의 공개 카탈로그입니다. `marketplace.json`이 색인이고, 확장은 GitHub 저장소의 폴더 하나하나로 등록합니다. 기본 확장은 모두 [pipaya-extensions](https://github.com/dohwi/pipaya-extensions) 한 저장소에 있습니다.

> [!WARNING]
> 서버 확장은 **서버의 모든 권한으로** 실행됩니다. 설치하기 전에 코드를 꼭 읽어 보세요.

## 카탈로그

| 확장 | 종류 | 버전 | 설명 |
|---|---|---|---|
| [guard](https://github.com/dohwi/pipaya-extensions/tree/main/guard) | server | 0.1.1 | 위험한 셸 명령(`rm -rf /`, `mkfs`, 포크 폭탄)을 실행 전에 차단 |
| [ask-user](https://github.com/dohwi/pipaya-extensions/tree/main/ask-user) | server | 0.1.1 | 에이전트가 선택지·추천과 함께 질문하고 답을 기다리게 함 |
| [peer-tools](https://github.com/dohwi/pipaya-extensions/tree/main/peer-tools) | server | 0.1.1 | 에이전트가 서로의 대화에 메시지를 보내고(`peer_send`) 읽게 함(`peer_read`) |
| [prompt-templates](https://github.com/dohwi/pipaya-extensions/tree/main/prompt-templates) | server | 0.1.1 | 긴 프롬프트를 Markdown 파일로 저장해 `/prompt:이름`으로 호출 |
| [session-retention](https://github.com/dohwi/pipaya-extensions/tree/main/session-retention) | server | 0.1.1 | 한동안 쓰지 않은 대화를 자동 삭제(기본은 꺼짐) |
| [quota-monitor](https://github.com/dohwi/pipaya-extensions/tree/main/quota-monitor) | client | 0.4.2 | Claude, GPT, Antigravity 잔량 게이지를 navbar에 표시 |

## 특징

- **두 종류**: `server` 확장(훅, 도구, `/명령`)과 `client` 확장(UI 패키지)
- **단일 색인**: 짧은 `marketplace.json`과 자동 생성되는 `index.json`뿐이고, 따로 운영할 레지스트리 서비스가 없음
- **CI 검증**: 모든 PR에서 id 중복, 폴더 경로, 고정된 태그와 커밋·`sha256`을 확인하고 `index.json`이 원본과 일치해야 함
- **단순한 CLI**: `list`, `install`, `remove`. Bun 외 의존성 없음

## 확장 설치

pipaya 앱에서는 **설정 → 확장 → 마켓플레이스**에서 설치합니다. 클라이언트 확장은 권한을 먼저 보여 준 뒤 설치하고, 서버 확장은 아래 명령을 안내합니다.

[Bun](https://bun.sh)이 필요합니다.

```bash
git clone https://github.com/dohwi/pipaya-marketplace && cd pipaya-marketplace

bun scripts/market.ts list
bun scripts/market.ts install guard          # 확장 폴더 하나를 ~/.pipaya/extensions/guard 로 복사
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://<server>/server-extensions/reload

bun scripts/market.ts install quota-monitor  # quota-monitor.json 저장 후 pipaya 앱에서 가져오기
bun scripts/market.ts remove guard
```

`PIPAYA_MARKET_URL`에 `index.json`의 raw URL을 넣으면 원격 카탈로그를 읽습니다. 서버 확장 설치에는 여전히 로컬 clone이 필요합니다.

## 확장 추가

`marketplace.json`에는 확장이 **어디에 있는지**만 적습니다. 이름, 버전, 설명, 작성자는 확장 자신의 파일에서, 라이선스는 GitHub 저장소에서 읽어 옵니다.

```json
{ "id": "my-ext", "kind": "server", "repo": "me/my-extensions", "dir": "my-ext", "ref": "my-ext-v1.0.0", "commit": "…" }
{ "id": "my-ui", "repo": "me/my-extensions", "dir": "my-ui", "ref": "my-ui-v1.0.0", "sha256": "…" }
{ "id": "solo", "kind": "server", "repo": "me/pipaya-extension-solo", "ref": "v1.0.0", "commit": "…" }
```

`repo`는 저장소, `dir`은 그 안의 폴더입니다. 확장 하나가 저장소 전체이면 `dir`을 생략합니다. 한 저장소에 확장 여러 개를 두면 태그를 `<id>-v<버전>`으로 만들어 확장마다 버전을 따로 관리하세요.

- **서버 확장**: 폴더(또는 저장소 루트)에 `index.ts`와 `package.json`(`name`, `version`, `description`, `license`, `author`)을 둡니다. 태그를 만든 뒤 `bun scripts/pin.ts my-ext my-ext-v1.0.0`으로 태그가 가리키는 커밋을 기록합니다. 태그가 나중에 다른 커밋으로 옮겨지면 CI와 설치가 거부합니다. 설치할 때는 그 폴더만 복사합니다.
- **클라이언트 확장**: 폴더에 `dist/<id>.json`이 담긴 태그를 만든 뒤 `bun scripts/pin.ts my-ui my-ui-v1.0.0`으로 태그와 `sha256`을 기록합니다. `ref`는 태그나 커밋이어야 하며 브랜치는 안 됩니다.
- `bun scripts/build-index.ts`를 실행해 생성된 `index.json`을 커밋합니다. 앱이 이 파일을 읽고, 오래되면 CI가 실패합니다.

## 프로젝트 구조

```
pipaya-marketplace/
├── marketplace.json      # 확장 위치 목록 (직접 작성)
├── index.json            # 자동 생성: 이름, 버전, 라이선스
├── scripts/              # market.ts CLI, build-index.ts, pin.ts, 테스트
└── .github/              # CI, README 에셋
```

## 기여

확장과 `marketplace.json` 항목을 추가하고 `bun test && bun scripts/validate.ts`를 통과시킨 뒤 PR을 열어 주세요. 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

[MIT](LICENSE)
