"""
Region-based soil profile defaults for Phase 1 MVP.

In a production system these values would be backed by a proper soil database
or external API. For now we use simple representative values by Indian state /
region and fall back to a reasonable default if the location does not match.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class SoilProfile:
  N: float
  P: float
  K: float
  ph: float


SOIL_PROFILES: Dict[str, SoilProfile] = {
  # Values are illustrative, not agronomically exact.
  "punjab": SoilProfile(N=90, P=40, K=35, ph=7.2),
  "haryana": SoilProfile(N=85, P=38, K=32, ph=7.3),
  "uttar pradesh": SoilProfile(N=70, P=35, K=30, ph=7.1),
  "maharashtra": SoilProfile(N=65, P=32, K=28, ph=6.8),
  "karnataka": SoilProfile(N=60, P=30, K=28, ph=6.5),
  "andhra pradesh": SoilProfile(N=62, P=31, K=29, ph=6.6),
  "telangana": SoilProfile(N=60, P=30, K=28, ph=6.7),
  "tamil nadu": SoilProfile(N=58, P=28, K=26, ph=6.4),
  "west bengal": SoilProfile(N=72, P=36, K=34, ph=6.9),
  "bihar": SoilProfile(N=68, P=33, K=31, ph=7.0),
  "rajasthan": SoilProfile(N=55, P=27, K=25, ph=7.5),
  "gujarat": SoilProfile(N=60, P=29, K=27, ph=7.3),
  "madhya pradesh": SoilProfile(N=65, P=31, K=29, ph=7.1),
  "odisha": SoilProfile(N=64, P=30, K=28, ph=6.7),
  "kerala": SoilProfile(N=58, P=29, K=27, ph=5.8),
  "assam": SoilProfile(N=70, P=34, K=32, ph=5.9),
  "default": SoilProfile(N=65, P=32, K=30, ph=6.8),
}


def get_soil_by_state(location: str) -> dict:
  """
  Infer a soil profile from a free-text location.

  We simply look for any known state/region name as a substring in the
  lower-cased location. If nothing matches, we fall back to the
  \"default\" profile.
  """

  if not location:
    profile = SOIL_PROFILES["default"]
    return {"N": profile.N, "P": profile.P, "K": profile.K, "ph": profile.ph}

  loc = location.lower()
  for key, profile in SOIL_PROFILES.items():
    if key == "default":
      continue
    if key in loc:
      return {"N": profile.N, "P": profile.P, "K": profile.K, "ph": profile.ph}

  profile = SOIL_PROFILES["default"]
  return {"N": profile.N, "P": profile.P, "K": profile.K, "ph": profile.ph}

