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

[pipaya](https://github.com/dohwi/pipaya) 확장의 공개 카탈로그입니다. git 저장소 하나로 운영합니다. `marketplace.json`이 색인이고, 서버 확장은 `extensions/`에 있으며, 클라이언트 확장은 각자의 저장소에서 가져옵니다.

> [!WARNING]
> 서버 확장은 **서버의 모든 권한으로** 실행됩니다. 설치하기 전에 코드를 꼭 읽어 보세요.

## 카탈로그

| 확장 | 종류 | 버전 | 설명 |
|---|---|---|---|
| [guard](extensions/guard) | server | 0.1.0 | 위험한 셸 명령(`rm -rf /`, `mkfs`, 포크 폭탄)을 실행 전에 차단 |
| [quota-monitor](https://github.com/dohwi/pipaya-extension-quota-monitor) | client | 0.4.1 | Claude, GPT, Antigravity 잔량 게이지를 navbar에 표시 |

## 특징

- **두 종류**: `server` 확장(훅, 도구, `/명령`)과 `client` 확장(UI 패키지)
- **단일 색인**: 검증되는 `marketplace.json` 하나뿐이고, 따로 운영할 레지스트리 서비스가 없음
- **CI 검증**: 모든 PR에서 id 중복, semver, 경로, https 소스를 확인
- **단순한 CLI**: `list`, `install`, `remove`. Bun 외 의존성 없음

## 확장 설치

pipaya 앱에서는 **설정 → 확장 → 마켓플레이스**에서 설치합니다. 클라이언트 확장은 권한을 먼저 보여 준 뒤 설치하고, 서버 확장은 아래 명령을 안내합니다.

[Bun](https://bun.sh)이 필요합니다.

```bash
git clone https://github.com/dohwi/pipaya-marketplace && cd pipaya-marketplace

bun scripts/market.ts list
bun scripts/market.ts install guard          # ~/.pipaya/extensions/guard 로 복사
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://<server>/server-extensions/reload

bun scripts/market.ts install quota-monitor  # quota-monitor.json 저장 후 pipaya 앱에서 가져오기
bun scripts/market.ts remove guard
```

`PIPAYA_MARKET_URL`에 `marketplace.json`의 raw URL을 넣으면 원격 카탈로그를 읽습니다. 서버 확장 설치에는 여전히 로컬 clone이 필요합니다.

## 카탈로그 형식

| 필드 | 의미 |
|---|---|
| `id` | 소문자, 숫자, 대시. 고유해야 함 |
| `kind` | `server` 또는 `client` |
| `version` | semver. 변경할 때마다 올림 |
| `license` | 필수 |
| `source` | `{ "type": "path", "path": "extensions/<id>" }`(server) 또는 `{ "type": "url", "url": "https://…", "sha256": "…" }`(client, 빌드된 패키지. 설치 전 파일의 `sha256`을 확인) |

## 프로젝트 구조

```
pipaya-marketplace/
├── marketplace.json      # 카탈로그
├── extensions/<id>/      # 서버 확장 (index.ts)
├── scripts/              # market.ts CLI, validate.ts, 테스트
└── .github/              # CI, README 에셋
```

## 기여

확장과 `marketplace.json` 항목을 추가하고 `bun test && bun scripts/validate.ts`를 통과시킨 뒤 PR을 열어 주세요. 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

[MIT](LICENSE)
