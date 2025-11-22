from __future__ import annotations

from typing import Literal, TypedDict

IntervalLiteral = Literal["minute", "day"]


class AssetDefinition(TypedDict):
    symbol: str
    name: str
    base: str
    quote: str
    vendor_ref: str | None


ASSET_CATALOG: tuple[AssetDefinition, ...] = (
    {"symbol": "BTC", "name": "Bitcoin", "base": "BTC", "quote": "USD", "vendor_ref": "btc-usd"},
    {"symbol": "ETH", "name": "Ethereum", "base": "ETH", "quote": "USD", "vendor_ref": "eth-usd"},
    {"symbol": "SOL", "name": "Solana", "base": "SOL", "quote": "USD", "vendor_ref": "sol-usd"},
    {"symbol": "USDC", "name": "USD Coin", "base": "USDC", "quote": "USD", "vendor_ref": "usdc-usd"},
    {"symbol": "USDT", "name": "Tether", "base": "USDT", "quote": "USD", "vendor_ref": "usdt-usd"},
    {"symbol": "AAVE", "name": "Aave", "base": "AAVE", "quote": "USD", "vendor_ref": "aave-usd"},
    {"symbol": "LINK", "name": "Chainlink", "base": "LINK", "quote": "USD", "vendor_ref": "link-usd"},
    {"symbol": "DOGE", "name": "Dogecoin", "base": "DOGE", "quote": "USD", "vendor_ref": "doge-usd"},
    {"symbol": "BNB", "name": "BNB", "base": "BNB", "quote": "USD", "vendor_ref": "bnb-usd"},
    {"symbol": "XRP", "name": "XRP", "base": "XRP", "quote": "USD", "vendor_ref": "xrp-usd"},
)

ASSET_SYMBOLS: tuple[str, ...] = tuple(asset["symbol"] for asset in ASSET_CATALOG)
ASSET_MAP: dict[str, AssetDefinition] = {asset["symbol"]: asset for asset in ASSET_CATALOG}
DEFAULT_INTERVALS: tuple[IntervalLiteral, ...] = ("minute", "day")


__all__ = [
    "ASSET_CATALOG",
    "ASSET_MAP",
    "ASSET_SYMBOLS",
    "DEFAULT_INTERVALS",
    "AssetDefinition",
    "IntervalLiteral",
]
